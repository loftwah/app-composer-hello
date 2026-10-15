import {verifySharing} from './scripts/verify-sharing.mjs';
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {expectedTarget,verifyTarget,verifyIdentity} from './release-target.mjs';
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
execFileSync('pnpm',['test'],{stdio:'inherit'});
const deploymentArgs=["wrangler", "deploy", "--config", "wrangler.jsonc", "--env=", "--define", "BUILD_SHA:" + JSON.stringify(sha)];
execFileSync('pnpm',[...deploymentArgs,'--dry-run','--outdir','.private/release-build'],{stdio:'inherit'});
unchanged();
execFileSync(
  "pnpm",
  deploymentArgs,
  { stdio: "inherit" },
);

let verified = false;
for (let attempt = 0; attempt < 12; attempt++) {
  if (await verifyIdentity(target,sha,c.title)) {
    verified = true;
    break;
  }
  await new Promise((resolve) => setTimeout(resolve, 1500));
}
if (!verified) throw new Error("Live source identity did not converge");
await verifySharing(target.origin);
console.log("Verified live hello " + sha+' at '+target.origin);
