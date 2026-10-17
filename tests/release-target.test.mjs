import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,copyFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {expectedTarget,verifyTarget,verifyIdentity} from '../release-target.mjs';
const env={HELLO_REPOSITORY:'fictional/hello',HELLO_ACCOUNT_ID:'a'.repeat(32),HELLO_WORKER:'fictional-hello',HELLO_ORIGIN:'https://hello.example.test'};
const target=expectedTarget(env);
const config={account_id:target.account,name:target.worker,vars:{PUBLIC_ORIGIN:target.origin},routes:[{pattern:'hello.example.test',custom_domain:true}],workers_dev:true};

test('release refuses absent/unsafe target and conflicting process account before tool/provider execution',()=>{
 assert.throws(()=>expectedTarget({}));
 for(const patch of [{HELLO_REPOSITORY:'https://secret@github.com/fictional/hello'},{HELLO_ACCOUNT_ID:'other'},{HELLO_WORKER:'../other'},{HELLO_ORIGIN:'http://hello.example.test'},{HELLO_ORIGIN:'https://secret@hello.example.test'},{HELLO_ORIGIN:'https://hello.example.test/'},{CLOUDFLARE_ACCOUNT_ID:'b'.repeat(32)}])assert.throws(()=>expectedTarget({...env,...patch}));
 const directory=new URL('..',import.meta.url).pathname;
 assert.throws(()=>execFileSync(process.execPath,['deploy.mjs'],{cwd:directory,env:{PATH:'/fictional/no-tools'},encoding:'utf8',stdio:['ignore','pipe','pipe']}),error=>error.status===1&&String(error.stderr).includes('Select HELLO_REPOSITORY'));
});

test('release binds actual remote/config and refuses extra routes, credential remotes and unintended targets',()=>{
 assert.equal(verifyTarget(config,target,'https://github.com/fictional/hello.git'),target);
 assert.equal(verifyTarget(config,target,'git@github.com:fictional/hello.git'),target);
 for(const patch of [{account_id:'b'.repeat(32)},{name:'other-hello'},{vars:{PUBLIC_ORIGIN:'https://other.example.test'}},{routes:[...config.routes,{pattern:'other.example.test',custom_domain:true}]},{routes:[{pattern:'hello.example.test/*',custom_domain:false}]}])assert.throws(()=>verifyTarget({...config,...patch},target,'https://github.com/fictional/hello.git'));
 for(const remote of ['https://secret@github.com/fictional/hello.git','https://github.com/other/hello.git','https://github.com/fictional/hello.git?token=secret'])assert.throws(()=>verifyTarget(config,target,remote));
 const workerTarget=expectedTarget({...env,HELLO_ORIGIN:'https://fictional-hello.fixture.workers.dev'});
 assert.equal(verifyTarget({...config,vars:{PUBLIC_ORIGIN:workerTarget.origin},routes:[]},workerTarget,'https://github.com/fictional/hello'),workerTarget);
 for(const patch of [{workers_dev:false},{routes:config.routes},{name:'another'}])assert.throws(()=>verifyTarget({...config,vars:{PUBLIC_ORIGIN:workerTarget.origin},routes:[],...patch},workerTarget,'https://github.com/fictional/hello'));
});

test('HTTPS acceptance uses selected hostname and requires exact app/source/title/contract without following redirects',async()=>{
 const sha='c'.repeat(40),identity={app:'hello',commit:sha,title:'Fictional welcome',contract:1,dataVersion:1};
 const request=async(url,options)=>{assert.equal(url,'https://hello.example.test/build.json');assert.equal(options.redirect,'error');return Response.json(identity);};
 assert.equal(await verifyIdentity(target,sha,identity.title,request),true);
 for(const patch of [{app:'other'},{commit:'d'.repeat(40)},{title:'Old greeting'},{contract:2},{dataVersion:2}])assert.equal(await verifyIdentity(target,sha,identity.title,async()=>Response.json({...identity,...patch})),false);
 assert.equal(await verifyIdentity(target,sha,identity.title,async()=>new Response(null,{status:302,headers:{location:'https://ready.loftwah.com/build.json'}})),false);
 assert.equal(await verifyIdentity(target,sha,identity.title,async()=>new Response('provider error',{status:503})),false);
 assert.equal(await verifyIdentity(target,sha,identity.title,async()=>{throw new Error('fictional timeout');}),false);
});

test('the selected pinned Wrangler parser yields a matching root release target',async()=>{
 const {unstable_readConfig}=await import('wrangler');
 const actual=unstable_readConfig({config:new URL('../wrangler.jsonc',import.meta.url).pathname,env:''},{hideWarnings:true});
 const selected=expectedTarget({HELLO_REPOSITORY:'loftwah/app-composer-hello',HELLO_ACCOUNT_ID:actual.account_id,HELLO_WORKER:actual.name,HELLO_ORIGIN:actual.vars.PUBLIC_ORIGIN});
 assert.equal(verifyTarget(actual,selected,'https://github.com/loftwah/app-composer-hello.git'),selected);
});

test('a target edit hidden from Git during the dry-run cannot reach actual deployment',()=>{
 const fixture=mkdtempSync(join(tmpdir(),'hello-release-race-')),workspace=join(fixture,'workspace'),bin=join(fixture,'bin'),marker=join(fixture,'deployed');
 mkdirSync(workspace);mkdirSync(bin);
 const git=args=>execFileSync('git',args,{cwd:workspace,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 try{
  mkdirSync(join(workspace,'scripts'));
  for(const file of ['deploy.mjs','release-target.mjs','scripts/verify-sharing.mjs'])copyFileSync(new URL('../'+file,import.meta.url),join(workspace,file));
  writeFileSync(join(workspace,'package.json'),' {"type":"module"}');
  writeFileSync(join(workspace,'.gitignore'),'node_modules/\n');
  writeFileSync(join(workspace,'wrangler.jsonc'),JSON.stringify(config));
  writeFileSync(join(workspace,'config.json'),JSON.stringify({title:'Fictional welcome',intro:'Fictional fixture',theme:'daylight'}));
  git(['init','-b','main']);git(['remote','add','origin','https://github.com/fictional/hello.git']);git(['add','.']);git(['-c','user.name=Fictional fixture','-c','user.email=fixture@example.test','commit','-m','Fictional fixture']);
  const sha=git(['rev-parse','HEAD']);git(['update-ref','refs/remotes/origin/main',sha]);
  mkdirSync(join(workspace,'node_modules/wrangler'),{recursive:true});
  writeFileSync(join(workspace,'node_modules/wrangler/package.json'),'{"type":"module","exports":"./index.mjs"}');
  writeFileSync(join(workspace,'node_modules/wrangler/index.mjs'),'import {readFileSync} from "node:fs";export const unstable_readConfig=()=>JSON.parse(readFileSync("wrangler.jsonc"));');
  writeFileSync(join(bin,'gh'),'#!/bin/sh\nprintf "%s\\n" "'+sha+'"\n',{mode:0o755});
  // The real deploy script/Git execute; only provider, build and deploy IO are fixtures.
  writeFileSync(join(bin,'pnpm'),'#!/bin/sh\nif [ "$1" = test ] || [ "$1" = check ]; then exit 0; fi\ncase "$*" in *--dry-run*) git update-index --assume-unchanged wrangler.jsonc; printf " " >> wrangler.jsonc; exit 0;; esac\nprintf "unexpected deployment" > "$RELEASE_TEST_MARKER"\n',{mode:0o755});
  assert.throws(()=>execFileSync(process.execPath,['deploy.mjs'],{cwd:workspace,env:{...env,PATH:bin+':'+process.env.PATH,HOME:fixture,RELEASE_TEST_MARKER:marker},encoding:'utf8',stdio:['ignore','pipe','pipe']}),error=>error.status===1&&String(error.stderr).includes('workspace changed'));
  assert.equal(git(['status','--porcelain']),'');assert.equal(existsSync(marker),false);
  assert.equal(readFileSync(join(workspace,'wrangler.jsonc'),'utf8').endsWith(' '),true);
 }finally{rmSync(fixture,{recursive:true});}
});
