const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
module.exports=function fixturePaymentKey(root,dbName){
  const file=path.join(root,'backend/.qa/payment-fixture-'+dbName+'.key');
  fs.mkdirSync(path.dirname(file),{recursive:true});
  if(!fs.existsSync(file))fs.writeFileSync(file,crypto.randomBytes(32).toString('base64'),{flag:'wx',mode:0o600});
  return fs.readFileSync(file,'utf8').trim();
};
