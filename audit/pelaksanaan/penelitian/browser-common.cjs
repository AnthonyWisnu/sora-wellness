const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {root,pool,src}=require('../fixture-db.cjs');
const {chromium}=require(path.join(root,'frontend/node_modules/playwright-core'));
const f=require('./fixtures.json');
const base='http://127.0.0.1:5173';
async function start(role,viewport={width:1280,height:900}) {
  await pool.query('DELETE FROM rate_limit_buckets');
  const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
  const context=await browser.newContext({viewport});
  const page=await context.newPage(),errors=[];
  page.setDefaultTimeout(10000);
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/masuk');
  await page.getByLabel('Email',{exact:true}).fill(f.users[role].email);
  await page.getByLabel('Kata sandi',{exact:true}).fill('PenelitianSora_2026_TestOnly');
  await page.getByRole('main').getByRole('button',{name:'Masuk',exact:true}).click();
  await page.getByRole('heading',{name:'Ringkasan',exact:true}).waitFor();
  return {browser,context,page,errors};
}
async function api(context,url,method='GET',body) {
  const headers={};
  if(method!=='GET') {
    const csrf=await context.request.get(base+'/api/v1/auth/csrf');
    assert.equal(csrf.status(),200);headers['x-csrf-token']=(await csrf.json()).token;
  }
  const response=await context.request.fetch(base+'/api/v1'+url,{method,headers,data:body});
  const value=await response.json();
  if(!response.ok())throw new Error(`${method} ${url}: HTTP ${response.status()} ${JSON.stringify(value.message)}`);
  return value;
}
function save(name,value) {fs.writeFileSync(path.join(__dirname,name+'.json'),JSON.stringify(value,null,2));}
async function screenshot(page,name) {fs.mkdirSync(path.join(__dirname,'screenshots'),{recursive:true});await page.screenshot({path:path.join(__dirname,'screenshots',name+'.png'),fullPage:true});}
function qaOrder(kind,value) {const file=path.join(root,'backend/.qa/research-'+kind+'-'+f.suffix+'.json');fs.writeFileSync(file,JSON.stringify(value),{mode:0o600});}
module.exports={start,api,save,screenshot,qaOrder,base,pool,f,root,src};
