const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
require(path.join(root,'backend/node_modules/dotenv')).config({path:path.join(root,'backend/.env'),quiet:true});
const {Pool}=require(path.join(root,'backend/node_modules/pg'));
const fixture=require('./00/local-fixtures.json');const url=new URL(process.env.DATABASE_URL);
assert.ok(['localhost','127.0.0.1'].includes(url.hostname));assert.equal(url.port,'55432');
assert.match(fixture.dbName,/^sora_audit_\d+$/);url.pathname='/'+fixture.dbName;
const scripts={health:'health-attendance-smoke',payments:'payment-state-smoke',packages:'package-state-smoke',cancellations:'cancellation-smoke','content-lockers':'content-lockers-smoke','admin-finance':'admin-finance-smoke',site:'site-cms-smoke'};
const name=process.argv[2];assert.ok(scripts[name]);
const env={...process.env,DATABASE_URL:url.href,API_BASE_URL:'http://127.0.0.1:3000',NODE_ENV:'development',MIDTRANS_ENV:'sandbox'};
const keyFile=path.join(root,'backend/.qa/health-fixture-'+fixture.dbName+'.json');
if(fs.existsSync(keyFile)){env.HEALTH_DATA_KEYS=fs.readFileSync(keyFile,'utf8');env.HEALTH_DATA_KEY_ID='fixture-v1';}
const directory=path.join(__dirname,'smoke');fs.mkdirSync(directory,{recursive:true});
(async()=>{
  const pool=new Pool({connectionString:url.href});
  try { assert.equal((await pool.query('SELECT current_database() AS name')).rows[0].name,fixture.dbName);await pool.query('DELETE FROM rate_limit_buckets'); }
  finally {await pool.end();}
  try {
    const output=execFileSync(process.execPath,[path.join(root,'backend/dist/scripts/'+scripts[name]+'.js')],{cwd:path.join(root,'backend'),env,encoding:'utf8',maxBuffer:4*1024*1024});
    fs.writeFileSync(path.join(directory,name+'.log'),output);console.log(output.trim());
    fs.writeFileSync(path.join(directory,name+'.json'),JSON.stringify({name,exitCode:0,target:'fixture sintetis lokal',script:scripts[name]},null,2));
  } catch(error) {
    const output=String(error.stdout||'')+'\n'+String(error.stderr||'');
    const sanitized=output.replace(/Riwayat patah tulang|Kondisi terbaru|RAHASIA KESEHATAN/g,'[catatan uji]');
    fs.writeFileSync(path.join(directory,name+'.log'),sanitized);console.error(sanitized.slice(-1800));
    fs.writeFileSync(path.join(directory,name+'.json'),JSON.stringify({name,exitCode:error.status,target:'fixture sintetis lokal',script:scripts[name]},null,2));process.exitCode=1;
  }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
