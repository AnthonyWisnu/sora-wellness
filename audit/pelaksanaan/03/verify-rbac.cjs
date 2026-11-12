const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'../../..');
require(path.join(root,'backend/node_modules/dotenv')).config({path:path.join(root,'backend/.env'),quiet:true});
const {Pool}=require(path.join(root,'backend/node_modules/pg'));
const {request}=require(path.join(root,'frontend/node_modules/playwright-core'));
const fixtures=require('../00/local-fixtures.json');
const url=new URL(process.env.DATABASE_URL);assert.ok(['localhost','127.0.0.1'].includes(url.hostname));
assert.match(fixtures.dbName,/^sora_audit_\d+$/);url.pathname='/'+fixtures.dbName;
const pool=new Pool({connectionString:url.href});
const log=fs.openSync(path.join(__dirname,'backend.log'),'w');
const backend=spawn(process.execPath,[path.join(root,'backend/dist/src/main.js')],{
  cwd:path.join(root,'backend'),windowsHide:true,stdio:['ignore',log,log],
  env:{...process.env,DATABASE_URL:url.href,PORT:'3002',NODE_ENV:'development',MIDTRANS_ENV:'sandbox',SESSION_SECRET:crypto.randomBytes(32).toString('hex'),MIDTRANS_SETTINGS_KEY:crypto.randomBytes(32).toString('base64')},
});
const base='http://127.0.0.1:3002/api/v1/';const results=[];let context;
(async()=>{
  for(let attempt=0;;attempt++) {
    try {await fetch(base+'auth/csrf');break;} catch(error) {if(attempt>40)throw error;await new Promise(r=>setTimeout(r,250));}
  }
  context=await request.newContext({baseURL:base});
  const token=(await(await context.get('auth/csrf')).json()).token;
  assert.equal((await context.post('auth/login',{headers:{'x-csrf-token':token},data:{email:fixtures.users.admin.email,password:'AuditLocal_2026_TestOnly'}})).status(),200);
  const cases={front_desk:'admin/sessions/'+fixtures.sessions[0]+'/participants',lockers:'admin/lockers',classes_schedule:'admin/schedule-rules',community_events:'admin/events',studio_content:'admin/site',studio_policy:'admin/policies',finance_reports:'admin/payments',finance_payouts:'admin/finance/withdrawals',staff_management:'admin/accounts'};
  for(const permission of Object.keys(cases)) {
    await pool.query('UPDATE app_users SET role=$1,permissions=$2 WHERE id=$3',['admin',[permission],fixtures.users.admin.id]);
    for(const [required,route] of Object.entries(cases)) {
      const response=await context.get(route);const expected=required===permission?200:403;
      assert.equal(response.status(),expected,permission+' -> '+required+' '+(await response.text()).slice(0,120));
      results.push({permission,required,status:response.status(),expected});
    }
  }
  for(const role of ['coach','customer','superadmin']) {
    await pool.query('UPDATE app_users SET role=$1,permissions=$2 WHERE id=$3',[role,[],fixtures.users.admin.id]);
    for(const [required,route] of Object.entries(cases)) {
      const response=await context.get(route);const expected=role==='superadmin'?200:403;
      assert.equal(response.status(),expected,role+' -> '+required);
      results.push({role,required,status:response.status(),expected});
    }
  }
  await pool.query('UPDATE app_users SET role=$1,permissions=$2 WHERE id=$3',['admin',['front_desk'],fixtures.users.admin.id]);
  const csrf=(await(await context.get('auth/csrf')).json()).token;
  const payload={title:'Denied class',category:'Yoga',level:'beginner',description:'Fixture test',durationMinutes:60,defaultCapacity:5,defaultPriceIdr:0};
  assert.equal((await context.post('admin/class-types',{headers:{'x-csrf-token':csrf},data:payload})).status(),403);
  results.push({name:'POST class direct request front_desk denied',status:403});
  assert.match((await context.get('admin/sessions')).headers()['cache-control'],/no-store/);
  results.push({name:'sensitive response private no-store',status:'PASS'});
})().catch(error=>{results.push({result:'FAIL',message:error.message});process.exitCode=1;}).finally(async()=>{
  await pool.query('UPDATE app_users SET role=$1,permissions=$2 WHERE id=$3',['admin',['front_desk'],fixtures.users.admin.id]);
  if(context)await context.dispose();await pool.end();backend.kill();
  fs.writeFileSync(path.join(__dirname,'http-results.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify({checks:results.length,failures:results.filter(r=>r.result==='FAIL')},null,2));
});
