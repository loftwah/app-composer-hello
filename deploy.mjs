import {verifySharing} from './scripts/verify-sharing.mjs';
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {CANONICAL_REPOSITORY,expectedTarget,isCanonicalProduction,verifyTarget,verifyIdentity} from './release-target.mjs';
// Refuse missing/malformed intent before Git, configuration parsing or provider calls.
const target=expectedTarget(process.env);
const originalDeployment=readFileSync('wrangler.jsonc','utf8');
const {unstable_readConfig}=await import('wrangler');
const deployment=unstable_readConfig({config:'wrangler.jsonc',env:''},{hideWarnings:true});
const git = (args) => execFileSync("git", args, { encoding: "utf8" }).trim();
verifyTarget(deployment,target,git(['remote','get-url','origin']));
if (git(["status", "--porcelain"]))
  throw new Error("Commit reviewed source before release");
if (
  git(["branch", "--show-current"]) !== "main" ||
  git(["rev-parse", "HEAD"]) !== git(["rev-parse", "origin/main"])
)
  throw new Error("Production requires exact reviewed pushed main");
const sha = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const originalConfig=readFileSync('config.json','utf8');
const c = JSON.parse(originalConfig);
if (
  typeof c.title !== "string" ||
  !c.title.trim() ||
  c.title.length > 80 ||
  typeof c.intro !== "string" ||
  c.intro.length > 240 ||
  !["daylight", "midnight"].includes(c.theme)
)
  throw new Error("Invalid reference configuration");
const upstream=execFileSync('gh',['api','repos/'+target.repository+'/commits/main','--jq','.sha'],{encoding:'utf8',timeout:20000,stdio:['ignore','pipe','pipe']}).trim();
if(upstream!==sha)throw new Error('The selected GitHub main source differs from the reviewed local source.');
// Recheck after provider/build IO, including bytes Git may consider assume-unchanged.
const unchanged=()=>{
  verifyTarget(deployment,target,git(['remote','get-url','origin']));
  if(git(['status','--porcelain'])||git(['rev-parse','HEAD'])!==sha||git(['branch','--show-current'])!=='main'||git(['rev-parse','origin/main'])!==sha||readFileSync('wrangler.jsonc','utf8')!==originalDeployment||readFileSync('config.json','utf8')!==originalConfig)throw new Error('The reviewed workspace changed during release verification.');
};
unchanged();

// Timing is opt-in only for the canonical, explicitly selected production
// repository. Forks run the exact same release with no receipts and no GitHub
// reporting; the timing module is not even loaded for them.
let timed = null;
if (isCanonicalProduction(target.repository)) {
  const {createReleaseRun,createGitHubAdapter} = await import('./scripts/lib/release-timing.mjs');
  let github = null;
  try {
    github = createGitHubAdapter({repo:CANONICAL_REPOSITORY});
  } catch (error) {
    console.error('Delivery SLA reporting unavailable; redacted events will be queued. ' + error.message);
  }
  // The monotonic clock starts before the first required check and stops only
  // after exact live identity and sharing are verified.
  timed = createReleaseRun({
    repo: CANONICAL_REPOSITORY,
    project: 'hello',
    sha,
    releasePath: 'deploy.mjs',
    kind: 'worker-production',
    receiptDir: '.release/timing',
    firstEditAt: process.env.HELLO_FIRST_EDIT_AT,
    github,
  });
  await timed.flushPending();
}
const stage = (name, work) => (timed ? timed.stage(name, work) : work());

try {
  await stage('required checks', () => execFileSync('pnpm',['check'],{stdio:'inherit'}));
  const deploymentArgs=["wrangler", "deploy", "--config", "wrangler.jsonc", "--env=", "--define", "BUILD_SHA:" + JSON.stringify(sha)];
  await stage('dry-run build', () => execFileSync('pnpm',[...deploymentArgs,'--dry-run','--outdir','.private/release-build'],{stdio:'inherit'}));
  unchanged();
  await stage('Worker upload', () => execFileSync("pnpm", deploymentArgs, { stdio: "inherit" }));
  await stage('live identity', async () => {
    for (let attempt = 0; attempt < 12; attempt++) {
      if (await verifyIdentity(target,sha,c.title)) return;
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    throw new Error("Live source identity did not converge");
  });
  await stage('sharing verification', () => verifySharing(target.origin));
  if (timed) await timed.finish({status:'passed',liveRevision:sha,target:target.origin});
  console.log("Verified live hello " + sha+' at '+target.origin);
} catch (error) {
  // Receipt bookkeeping must never replace the original release failure.
  if (timed) {
    try {
      await timed.fail(error, {target:target.origin});
    } catch (receiptError) {
      console.error('Could not record timing receipt: ' + receiptError.message);
    }
  }
  throw error;
}
