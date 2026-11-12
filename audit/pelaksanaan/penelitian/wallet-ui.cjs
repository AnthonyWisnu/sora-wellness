const assert=require('node:assert/strict');
const {start,base,pool,f,api,save}=require('./browser-common.cjs');
let customer,admin,withdrawal;
(async()=>{
  customer=await start('guest');admin=await start('admin');const page=customer.page;
  const before=(await api(customer.context,'/me/wallet')).balanceIdr;
  await page.goto(base+'/dashboard/wallet');
  await page.getByRole('button',{name:'Tarik Saldo ke Rekening / E-Wallet',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel('Nomor Rekening',{exact:true}).fill('0000000000');
  await dialog.getByLabel('Nama Lengkap Pemilik Rekening / Akun',{exact:true}).fill('Data Sintetis Penelitian');
  await dialog.getByRole('spinbutton').fill('10000');
  const created=page.waitForResponse(r=>r.url().endsWith('/api/v1/me/wallet/withdraw')&&r.request().method()==='POST');
  await dialog.getByRole('button',{name:'Ajukan Penarikan',exact:true}).click();
  const response=await created;assert.equal(response.status(),201);withdrawal=await response.json();
  await dialog.waitFor({state:'hidden'});
  const expected='Rp'+new Intl.NumberFormat('id-ID').format(before-10000);
  await page.locator('.dashboard-wallet-balance > strong').filter({hasText:expected}).waitFor();
  save('wallet-ui-results',{result:'PASS',balanceBefore:before,balanceAfter:before-10000,updatedWithoutReload:true,bankTransferPerformed:false,browserErrors:customer.errors});
  console.log('PASS: saldo pada layar wallet langsung diperbarui sesudah pengajuan tanpa reload');
})().catch(error=>{console.error(error.stack);process.exitCode=1}).finally(async()=>{
  if(withdrawal&&admin)await api(admin.context,`/admin/finance/withdrawals/${withdrawal.id}/reject`,'POST',{reason:'Pemulihan fixture setelah uji UI'}).catch(()=>undefined);
  if(customer)await customer.browser.close();if(admin)await admin.browser.close();await pool.end();
});
