// Release inputs are explicit operator intent, not defaults copied from this repository.
export function expectedTarget(env) {
  const target={repository:env.HELLO_REPOSITORY,account:env.HELLO_ACCOUNT_ID,worker:env.HELLO_WORKER,origin:env.HELLO_ORIGIN};
  if(typeof target.repository!=='string'||!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(target.repository)||typeof target.account!=='string'||!/^[a-f0-9]{32}$/.test(target.account)||typeof target.worker!=='string'||!/^[a-z][a-z0-9-]{0,62}$/.test(target.worker))throw new Error('Select HELLO_REPOSITORY, HELLO_ACCOUNT_ID, HELLO_WORKER and HELLO_ORIGIN explicitly before release.');
  let url;try{url=new URL(target.origin);}catch{throw new Error('Select an exact credential-free HTTPS origin.');}
  if(url.protocol!=='https:'||url.username||url.password||url.port||url.origin!==target.origin)throw new Error('Select an exact credential-free HTTPS origin.');
  if(env.CLOUDFLARE_ACCOUNT_ID&&env.CLOUDFLARE_ACCOUNT_ID!==target.account)throw new Error('The process selects another Cloudflare account.');
  return target;
}

export function verifyTarget(config,target,remote) {
  const repository=/^https:\/\/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?)(?:\.git)?$/.exec(remote)?.[1]??/^git@github\.com:([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?)(?:\.git)?$/.exec(remote)?.[1];
  if(repository!==target.repository||config.account_id!==target.account||config.name!==target.worker||config.vars?.PUBLIC_ORIGIN!==target.origin)throw new Error('Repository, account, Worker or public origin differs from the explicit release target.');
  const host=new URL(target.origin).hostname;
  const routes=config.routes??(config.route?[config.route]:[]);
  if(host.endsWith('.workers.dev')){
    if(!config.workers_dev||routes.length||!new RegExp('^'+target.worker.replaceAll('-','\\-')+'\\.[a-z0-9-]+\\.workers\\.dev$').test(host))throw new Error('The workers.dev target requires its selected Worker and no custom routes.');
  }else if(routes.length!==1||routes[0]?.custom_domain!==true||routes[0].pattern!==host)throw new Error('The custom-domain release must select exactly its intended hostname.');
  return target;
}

export async function verifyIdentity(target,sha,title,request=fetch) {
  try{
    const response=await request(target.origin+'/build.json',{redirect:'error',headers:{'User-Agent':'Mozilla/5.0 (AppComposer verification)'},signal:AbortSignal.timeout(10000)});
    if(!response.ok||response.redirected)return false;
    const identity=await response.json();
    return identity.app==='hello'&&identity.commit===sha&&identity.title===title&&identity.contract===1&&identity.dataVersion===1;
  }catch{return false;}
}
