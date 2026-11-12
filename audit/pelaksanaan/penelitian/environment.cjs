const fs=require('node:fs'),path=require('node:path');
const {pool,root}=require('../fixture-db.cjs');
(async()=>{
  const version=(await pool.query('SHOW server_version')).rows[0].server_version;
  const count=(await pool.query("SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'")).rows[0].count;
  const schema=await(await fetch('http://127.0.0.1:3000/api/docs-json')).json();
  const result={recordedAt:new Date().toISOString(),os:'Windows, pengujian lokal',node:process.version,postgresql:version,publicTablesInFixture:count,openapi:schema.openapi,apiPaths:Object.keys(schema.paths??{}).length,browser:'Microsoft Edge headless melalui playwright-core',data:'sintetis',deployment:'belum push/deploy'};
  fs.writeFileSync(path.join(__dirname,'environment.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
})().catch(error=>{console.error(error.message);process.exitCode=1}).finally(()=>pool.end());
