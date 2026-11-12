const path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
process.env.NODE_PATH=path.join(root,'backend/node_modules');require('node:module').Module._initPaths();
require(path.join(root,'backend/node_modules/dotenv')).config({path:path.join(root,'backend/.env'),quiet:true});
const {Pool}=require('pg');
const fixture=require('./00/local-fixtures.json');
const url=new URL(process.env.DATABASE_URL);
assert.ok(['localhost','127.0.0.1'].includes(url.hostname));
assert.match(fixture.dbName,/^sora_audit_\d+$/);
url.pathname='/'+fixture.dbName;
const pool=new Pool({connectionString:url.href});
const db={pool,query:(sql,args)=>pool.query(sql,args),transaction:async fn=>{
  const client=await pool.connect();
  try {await client.query('BEGIN');const result=await fn(client);await client.query('COMMIT');return result;}
  catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}};
module.exports={root,fixture,pool,db,src:name=>require(path.join(root,'backend/dist/src',name))};
