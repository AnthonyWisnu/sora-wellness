const assert=require('node:assert/strict');
const {start,base,pool,f,save}=require('./browser-common.cjs');
let runtime;
(async()=>{
  runtime=await start('admin');const {page}=runtime;
  await page.goto(base+'/dashboard/accounts');
  await page.getByPlaceholder('Cari nama atau email',{exact:true}).fill(f.users.superadmin.email);
  await page.getByRole('button',{name:'Cari akun',exact:true}).click();
  const row=page.getByRole('row').filter({hasText:f.users.superadmin.email});await row.waitFor();
  assert.equal(await row.getByRole('button',{name:'Reset sandi',exact:true}).count(),0);
  assert.equal(await page.getByRole('button',{name:'Atur Izin',exact:true}).count(),0);
  await page.getByRole('button',{name:'Buat akun staf',exact:true}).click();
  const dialog=page.getByRole('dialog');await dialog.waitFor();
  const options=dialog.getByRole('combobox',{name:'Peran',exact:true}).getByRole('option');assert.equal(await options.count(),1);
  assert.equal(await options.textContent(),'Pelatih');
  save('account-actions-results',{result:'PASS',adminCannotOfferRootReset:true,adminCannotOfferGrantPermissions:true,adminCreatesCoachOnly:true,browserErrors:runtime.errors});
  console.log('PASS: aksi akun admin sesuai wewenang backend, tanpa tombol reset superadmin atau pengaturan izin');
})().catch(error=>{console.error(error.stack);process.exitCode=1}).finally(async()=>{if(runtime)await runtime.browser.close();await pool.end()});
