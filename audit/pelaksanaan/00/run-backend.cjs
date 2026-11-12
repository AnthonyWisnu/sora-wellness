const fs=require('node:fs');
const path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../..');
require(path.join(root,'backend/node_modules/dotenv')).config({path:path.join(root,'backend/.env'),quiet:true});
const f=require('./local-fixtures.json');const url=new URL(process.env.DATABASE_URL);
assert.ok(['localhost','127.0.0.1'].includes(url.hostname));assert.match(f.dbName,/^sora_audit_\d+$/);
url.pathname='/'+f.dbName;
Object.assign(process.env,{
  DATABASE_URL:url.href,PORT:'3000',NODE_ENV:'development',MIDTRANS_ENV:'sandbox',
  SESSION_SECRET:crypto.randomBytes(32).toString('hex'),MIDTRANS_SETTINGS_KEY:require('./fixture-payment-key.cjs')(root,f.dbName),
  MEDIA_STORAGE_DIR:path.join(__dirname,'uploads'),FRONTEND_ORIGIN:'http://127.0.0.1:5173',PUBLIC_APP_URL:'http://127.0.0.1:5173',
});
const keyFolder=path.join(root,'backend/.qa');fs.mkdirSync(keyFolder,{recursive:true});
const keyFile=path.join(keyFolder,'health-fixture-'+f.dbName+'.json');
if(!fs.existsSync(keyFile))fs.writeFileSync(keyFile,JSON.stringify({'fixture-v1':crypto.randomBytes(32).toString('base64')}),{mode:0o600,flag:'wx'});
process.env.HEALTH_DATA_KEY_ID='fixture-v1';process.env.HEALTH_DATA_KEYS=fs.readFileSync(keyFile,'utf8');
delete process.env.MIDTRANS_NOTIFICATION_URL;
require(path.join(root,'backend/dist/src/main.js'));
