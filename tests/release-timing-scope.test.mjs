// Focused integration fixture for the timing scope boundary. The canonical
// production repository is timed; any fork runs the unchanged release with no
// receipt and no GitHub issue call. Only external IO is stubbed.
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,copyFileSync,readFileSync,readdirSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const ACCOUNT='a'.repeat(32);
const INTENT={
 fork:{repo:'fictional/hello',worker:'fictional-hello',origin:'https://fictional-hello.example.test',remote:'https://github.com/fictional/hello.git'},
 canonical:{repo:'loftwah/app-composer-hello',worker:'canonical-hello',origin:'https://canonical-hello.example.test',remote:'https://github.com/loftwah/app-composer-hello.git'},
};

function releaseFixture(t,intent){
 const dir=mkdtempSync(join(tmpdir(),'hello-timing-scope-'));
 t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const workspace=join(dir,'workspace'),bin=join(dir,'bin');
 mkdirSync(workspace);mkdirSync(bin);mkdirSync(join(workspace,'scripts/lib'),{recursive:true});
 const git=args=>execFileSync('git',args,{cwd:workspace,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 for(const file of ['deploy.mjs','release-target.mjs','scripts/verify-sharing.mjs','scripts/lib/release-timing.mjs'])copyFileSync(new URL('../'+file,import.meta.url),join(workspace,file));
 writeFileSync(join(workspace,'package.json'),'{"type":"module"}');
 writeFileSync(join(workspace,'.gitignore'),'node_modules/\n.release/\n');
 const config={account_id:ACCOUNT,name:intent.worker,vars:{PUBLIC_ORIGIN:intent.origin},routes:[{pattern:new URL(intent.origin).hostname,custom_domain:true}],workers_dev:true};
 writeFileSync(join(workspace,'wrangler.jsonc'),JSON.stringify(config));
 writeFileSync(join(workspace,'config.json'),JSON.stringify({title:'Fictional welcome',intro:'Fictional fixture',theme:'daylight'}));
 git(['init','-b','main']);git(['remote','add','origin',intent.remote]);git(['add','.']);
 git(['-c','user.name=Fictional','-c','user.email=fixture@example.test','commit','-m','fixture']);
 const sha=git(['rev-parse','HEAD']);git(['update-ref','refs/remotes/origin/main',sha]);
 mkdirSync(join(workspace,'node_modules/wrangler'),{recursive:true});
 writeFileSync(join(workspace,'node_modules/wrangler/package.json'),'{"type":"module","exports":"./index.mjs"}');
 writeFileSync(join(workspace,'node_modules/wrangler/index.mjs'),'import {readFileSync} from "node:fs";export const unstable_readConfig=()=>JSON.parse(readFileSync("wrangler.jsonc"));');
 const ghLog=join(dir,'gh.log');
 writeFileSync(join(bin,'gh'),'#!/bin/sh\nprintf "%s\\n" "$*" >> "$GH_LOG"\nprintf "%s\\n" "$EXPECTED_SHA"\n',{mode:0o755});
 // Force a failure at the first required check: timing is already armed, so the
 // catch path records the receipt without ever reaching a real upload or issue.
 writeFileSync(join(bin,'pnpm'),'#!/bin/sh\n[ "$1" = check ] && { printf "fixture check failure\\n" >&2; exit 1; }\nexit 0\n',{mode:0o755});
 const env={PATH:bin+':'+process.env.PATH,HOME:dir,GH_LOG:ghLog,EXPECTED_SHA:sha,HELLO_REPOSITORY:intent.repo,HELLO_ACCOUNT_ID:ACCOUNT,HELLO_WORKER:intent.worker,HELLO_ORIGIN:intent.origin};
 let error=null;
 try{execFileSync(process.execPath,['deploy.mjs'],{cwd:workspace,env,encoding:'utf8',stdio:['ignore','pipe','pipe']});}
 catch(caught){error=caught;}
 const timingDir=join(workspace,'.release/timing');
 const receipts=existsSync(timingDir)
  ?readdirSync(timingDir).filter(file=>/^receipt-.*\.json$/.test(file)).map(file=>JSON.parse(readFileSync(join(timingDir,file),'utf8')))
  :[];
 const ghCalls=existsSync(ghLog)?readFileSync(ghLog,'utf8'):'';
 return {error,receipts,ghCalls};
}

test('a fork release stays fully functional but untimed: no receipt, no issue call',t=>{
 const {error,receipts,ghCalls}=releaseFixture(t,INTENT.fork);
 assert.ok(error,'the original release error is preserved');
 assert.equal(error.status,1);
 assert.deepEqual(receipts,[],'forks create no timing receipts');
 assert.ok(!ghCalls.includes(' issue '),'fork timing creates no GitHub issue call');
 assert.ok(ghCalls.includes('api repos/fictional/hello/commits/main'),'the pre-existing upstream guard still runs');
});

test('the canonical production target records a failed receipt and files no issue',t=>{
 const {error,receipts,ghCalls}=releaseFixture(t,INTENT.canonical);
 assert.ok(error,'the original release error is preserved');
 assert.equal(error.status,1);
 assert.equal(receipts.length,1);
 assert.equal(receipts[0].status,'failed');
 assert.equal(receipts[0].repo,'loftwah/app-composer-hello');
 assert.equal(receipts[0].releasePath,'deploy.mjs');
 assert.match(receipts[0].failure,/pnpm check/);
 assert.ok(!ghCalls.includes(' issue '),'a failed run files no GitHub issue');
});
