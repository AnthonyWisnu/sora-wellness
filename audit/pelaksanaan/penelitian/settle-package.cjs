const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {start,root,f,pool,api,save,base,screenshot}=require('./browser-common.cjs');
const paySandbox=require('./sandbox-payment.cjs');
let runtime;
(async()=>{
  runtime=await start('member');
  const order=JSON.parse(fs.readFileSync(path.join(root,'backend/.qa/research-package-'+f.suffix+'.json'),'utf8'));
  const report=await paySandbox(runtime,order,'package');
  const purchase=await api(runtime.context,`/me/membership-purchases/${order.id}`);
  assert.equal(purchase.status,'paid');
  const count=(await pool.query('SELECT count(*)::int AS count FROM memberships WHERE purchase_id=$1',[order.id])).rows[0].count;
  assert.equal(count,1);
  const membership=await api(runtime.context,'/me/membership');assert.ok(membership.ranges.length);
  await runtime.page.goto(base+'/dashboard/membership');
  await runtime.page.getByRole('heading',{name:'Paket terbayar',exact:true}).waitFor();
  await screenshot(runtime.page,'member-package-paid');
  save('sandbox-package-results',{...report,membershipRows:count,purchaseStatus:purchase.status,startsOn:purchase.startsOn,endsOn:purchase.endsOn,browserErrors:runtime.errors});
  console.log(JSON.stringify({...report,membershipRows:count}));
})().catch(error=>{console.error(error.message);process.exitCode=1}).finally(async()=>{if(runtime)await runtime.browser.close();await pool.end()});
