const {root,db,pool,fixture,src}=require('./fixture-db.cjs');
const {Pool}=require('pg');
const {PaymentSettings}=src('payments/payment-settings');
const {MidtransClient}=src('payments/midtrans');
const {randomUUID}=require('node:crypto');
const path=require('node:path'),assert=require('node:assert/strict');
const sourceUrl=new URL(process.env.DATABASE_URL);
assert.ok(['127.0.0.1','localhost'].includes(sourceUrl.hostname));
assert.equal(sourceUrl.port,'55432');
const source=new Pool({connectionString:sourceUrl.href});
(async()=>{
  let value;
  try {value=await new PaymentSettings({query:(s,v)=>source.query(s,v)}).credentials();}
  catch {console.log(JSON.stringify({sandboxConfigured:false,reason:'Kredensial Sandbox lokal tidak tersedia atau tidak dapat dibaca'}));return;}
  if(!/^(SB-)?Mid-server-/.test(value.serverKey) || !/^(SB-)?Mid-client-/.test(value.clientKey)) {
    console.log(JSON.stringify({sandboxConfigured:false,reason:'Format kredensial tidak sesuai'}));return;
  }
  const status=await new MidtransClient(value.serverKey).getTransactionStatus('audit-check-'+randomUUID().slice(0,12));
  if(status.status_code!=='404') throw new Error('Verifikasi Sandbox belum berhasil');
  process.env.MIDTRANS_SETTINGS_KEY=require('./00/fixture-payment-key.cjs')(root,fixture.dbName);
  await new PaymentSettings(db).save(value);
  console.log(JSON.stringify({sandboxConfigured:true,credentialsPrinted:false,target:'fixture lokal'}));
})().catch(()=>{console.error('Penyiapan Sandbox fixture gagal');process.exitCode=1;}).finally(async()=>{await source.end();await pool.end()});
