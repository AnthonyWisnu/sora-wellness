const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const {pool,root}=require('../fixture-db.cjs');
const supertest=require(path.join(root,'backend/node_modules/supertest'));
const f=require('./fixtures.json');
const password='PenelitianSora_2026_TestOnly',agents=[],users=[];
(async()=>{
  const hash=(await pool.query('SELECT password_hash FROM app_users WHERE id=$1',[f.users.member.id])).rows[0].password_hash;
  for(let n=0;n<50;n++) {
    if(n%5===0)await pool.query('DELETE FROM rate_limit_buckets');
    const email='race-'+crypto.randomUUID()+'@example.test';
    const id=(await pool.query("INSERT INTO app_users(email,full_name,role,password_hash) VALUES($1,'Peserta uji konkurensi','customer',$2) RETURNING id",[email,hash])).rows[0].id;
    users.push(id);await pool.query('INSERT INTO wallet_accounts(customer_id) VALUES($1)',[id]);
    const agent=supertest.agent('http://127.0.0.1:3000');
    const csrf=(await agent.get('/api/v1/auth/csrf').expect(200)).body.token;
    await agent.post('/api/v1/auth/login').set('x-csrf-token',csrf).send({email,password}).expect(200);
    const token=(await agent.get('/api/v1/auth/csrf').expect(200)).body.token;
    agents.push({agent,token});
    if(n%10===9)console.log('Authenticated fixtures: '+(n+1));
  }
  const start=performance.now();
  const requests=agents.map(({agent,token})=>agent.post('/api/v1/bookings').set('x-csrf-token',token)
    .set('Idempotency-Key',crypto.randomUUID()).send({sessionId:f.sessions.race,paymentChoice:'single'}).then(r=>({status:r.status,body:r.body})));
  const dispatchWindowMs=performance.now()-start;
  const responses=await Promise.all(requests),elapsedMs=performance.now()-start;
  const counts=responses.reduce((a,r)=>(a[r.status]=(a[r.status]??0)+1,a),{});
  assert.equal(counts[201],1);assert.equal(counts[409],49);
  assert.ok(responses.filter(r=>r.status===409).every(r=>/penuh/i.test(r.body.message)));
  const row=(await pool.query("SELECT count(*)::int AS count FROM bookings WHERE session_id=$1 AND status='confirmed'",[f.sessions.race])).rows[0];
  assert.equal(row.count,1);
  const report={result:'PASS',transport:'HTTP /api/v1/bookings',authenticatedCustomers:50,requests:50,capacity:1,statuses:counts,confirmedBookings:row.count,overbooking:0,dispatchWindowMs,elapsedMs};
  fs.writeFileSync(path.join(__dirname,'concurrency-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
})().catch(error=>{console.error(error.message);process.exitCode=1}).finally(async()=>{await pool.end()});
