const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {db,pool,root,src}=require('../fixture-db.cjs');
const {hashPassword}=src('shared/security');
const password='PenelitianSora_2026_TestOnly';
const suffix=crypto.randomUUID().slice(0,8);
const permissions=['front_desk','lockers','classes_schedule','community_events','studio_content','studio_policy','finance_reports','finance_payouts','staff_management'];
(async()=>{
  const hash=await hashPassword(password),users={};
  for(const [name,role,label,grants] of [
    ['superadmin','superadmin','Pengelola SORA',[]],['admin','admin','Staf Operasional',permissions],
    ['coach','coach','Coach Surya',[]],['member','customer','Ayu Penelitian',[]],
    ['guest','customer','Bima Penelitian',[]],['frontdesk','admin','Resepsionis Penelitian',['front_desk']],
    ['otherCoach','coach','Coach Lain',[]],['rosterMember','customer','Peserta Demonstrasi',[]],
  ]) {
    const email=`${name}-${suffix}@example.test`;
    const row=(await pool.query('INSERT INTO app_users(email,full_name,role,password_hash,permissions) VALUES($1,$2,$3,$4,$5) RETURNING id',[email,label,role,hash,grants])).rows[0];
    users[name]={id:row.id,email};
    if(role==='customer')await pool.query('INSERT INTO wallet_accounts(customer_id) VALUES($1)',[row.id]);
  }
  const classes={};
  for(const [name,title,level,price] of [['yoga','Yoga Dasar Penelitian','beginner',75000],['pilates','Pilates Member Penelitian','intermediate_1',90000]]) {
    classes[name]=(await pool.query(`INSERT INTO class_types(title,category,level,duration_minutes,default_capacity,default_price_idr) VALUES($1,$2,$3,60,12,$4) RETURNING id`,[title,name==='yoga'?'Yoga':'Pilates',level,price])).rows[0].id;
  }
  const sessions={};
  for(const [name,kind,days,hour,price,capacity] of [['free','yoga',2,7,0,12],['paid','yoga',2,9,75000,12],['quota','pilates',3,9,90000,12],['priority','pilates',14,9,90000,12],['race','yoga',4,14,0,1]]) {
    sessions[name]=(await pool.query(`INSERT INTO class_sessions(class_type_id,coach_id,local_date,starts_at,ends_at,capacity,price_idr)
      SELECT $1,$2,(now() AT TIME ZONE timezone)::date+$3::int,
      (((now() AT TIME ZONE timezone)::date+$3::int)+($4::int*interval '1 hour')) AT TIME ZONE timezone,
      (((now() AT TIME ZONE timezone)::date+$3::int)+(($4::int+1)*interval '1 hour')) AT TIME ZONE timezone,$5,$6
      FROM studio WHERE id=1 RETURNING id`,[classes[kind],users.coach.id,days,hour,capacity,price])).rows[0].id;
  }
  const current=(await pool.query(`INSERT INTO class_sessions(class_type_id,coach_id,local_date,starts_at,ends_at,capacity,price_idr)
    SELECT $1,$2,(now() AT TIME ZONE timezone)::date,now()-interval '10 minutes',now()+interval '3 hours',12,0 FROM studio WHERE id=1 RETURNING id`,[classes.yoga,users.coach.id])).rows[0].id;
  sessions.active=current;
  const booking=(await pool.query(`INSERT INTO bookings(customer_id,session_id,status,source,price_idr,idempotency_key,confirmed_at,booking_code)
    VALUES($1,$2,'confirmed','free',0,$3,now(),'SORA-STUDI-'||$4) RETURNING id`,[users.rosterMember.id,current,crypto.randomUUID(),suffix.toUpperCase()])).rows[0].id;
  const keys=JSON.parse(fs.readFileSync(path.join(root,'backend/.qa/health-fixture-'+require('../00/local-fixtures.json').dbName+'.json'),'utf8'));
  process.env.HEALTH_DATA_KEY_ID='fixture-v1';process.env.HEALTH_DATA_KEYS=JSON.stringify(keys);
  const {encryptHealth}=src('health/health-crypto');
  await pool.query(`INSERT INTO health_profiles(customer_id,note,consented_at) VALUES($1,$2,now())`,[users.rosterMember.id,encryptHealth('Data sintetis: lutut membutuhkan modifikasi gerakan.',users.rosterMember.id)]);
  const result={suffix,users,classes,sessions,activeBooking:booking,createdAt:new Date().toISOString(),provider:'Midtrans Sandbox nyata bila checkout diuji'};
  fs.writeFileSync(path.join(__dirname,'fixtures.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify({fixture:'sintetis terisolasi',roles:Object.keys(users),sessions:Object.keys(sessions),credentialsPrinted:false}));
})().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>pool.end());
