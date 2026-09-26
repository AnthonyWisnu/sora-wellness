import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Db } from '../src/shared/db';
import { MembershipPurchasesService, membershipStart } from '../src/membership/membership-purchases';
import { PaymentSettings } from '../src/payments/payment-settings';
import { PaymentsService } from '../src/payments/payments';

async function main() {
  const db = new Db();
  const payments = new PaymentsService(db,new PaymentSettings(db));
  const created = await db.query<{ id: string }>(`INSERT INTO app_users (email,full_name,role,password_hash) VALUES ($1,'Uji Paket','customer','fixture-only') RETURNING id`, [`package-smoke-${randomUUID()}@example.test`]);
  const customerId = created.rows[0].id;
  let purchaseId: string | undefined;
  let freeOptionId: string | undefined;
  try {
    const option = await db.query<{ id: string; duration_months: number; price_idr: number }>('SELECT id,duration_months,price_idr FROM package_options WHERE active=true AND price_idr>0 ORDER BY duration_months LIMIT 1');
    assert.ok(option.rows[0], 'Opsi paket berbayar seed tersedia');
    const o = option.rows[0];
    const purchase = await db.query<{ id: string }>(`INSERT INTO package_purchases (customer_id,package_option_id,amount_idr,duration_months,status,idempotency_key) VALUES ($1,$2,$3,$4,'pending_payment',$5) RETURNING id`, [customerId,o.id,o.price_idr,o.duration_months,randomUUID()]);
    purchaseId = purchase.rows[0].id;
    const orderId = `PKG-${purchaseId}`;
    await db.query(`INSERT INTO payment_transactions (package_purchase_id,order_id,gross_amount_idr,status) VALUES ($1,$2,$3,'pending')`, [purchaseId,orderId,o.price_idr]);
    const paid = await payments.applyTrustedPackageStatus(orderId,{ transaction_status: 'settlement', status_code: '200', fraud_status: 'accept' });
    assert.equal(paid.purchaseStatus,'paid');
    await payments.applyTrustedPackageStatus(orderId,{ transaction_status: 'settlement', status_code: '200', fraud_status: 'accept' });
    const membership = await db.query<{ count: number; starts_on: string; ends_on: string }>(`SELECT count(*)::int AS count,min(starts_on)::text AS starts_on,max(ends_on)::text AS ends_on FROM memberships WHERE purchase_id=$1`, [purchaseId]);
    assert.equal(membership.rows[0].count,1,'Webhook duplikat tidak menggandakan masa aktif');
    const gap = await db.transaction(client => membershipStart(client,customerId));
    assert.ok(gap > membership.rows[0].ends_on,'Perpanjangan mulai setelah paket lama');
    const payment = await db.query<{ status: string }>('SELECT status FROM payment_transactions WHERE package_purchase_id=$1', [purchaseId]);
    assert.equal(payment.rows[0].status,'success');
    await db.query("UPDATE memberships SET ends_on=(now() AT TIME ZONE (SELECT timezone FROM studio WHERE id=1))::date+31 WHERE purchase_id=$1", [purchaseId]);
    await assert.rejects(db.transaction(client => membershipStart(client,customerId)), /30 hari/);
    await db.query("UPDATE memberships SET ends_on=(now() AT TIME ZONE (SELECT timezone FROM studio WHERE id=1))::date+30 WHERE purchase_id=$1", [purchaseId]);
    assert.ok(await db.transaction(client => membershipStart(client,customerId)));
    const abandoned = await db.query<{ id: string }>(`INSERT INTO package_purchases (customer_id,package_option_id,amount_idr,duration_months,status,idempotency_key,expires_at) VALUES ($1,$2,$3,$4,'pending_payment',$5,now()-interval '1 minute') RETURNING id`, [customerId,o.id,o.price_idr,o.duration_months,randomUUID()]);
    const abandonedOrder = `PKG-${abandoned.rows[0].id}`;
    await db.query(`INSERT INTO payment_transactions (package_purchase_id,order_id,gross_amount_idr,status) VALUES ($1,$2,$3,'pending')`, [abandoned.rows[0].id,abandonedOrder,o.price_idr]);
    await payments.refreshByOrder(abandonedOrder);
    const expired = await db.query<{ status: string }>('SELECT status FROM package_purchases WHERE id=$1', [abandoned.rows[0].id]);
    assert.equal(expired.rows[0].status,'expired');
    const unused = await db.query<{ duration: number }>('SELECT d AS duration FROM generate_series(36,1,-1) d WHERE NOT EXISTS (SELECT 1 FROM package_options WHERE duration_months=d) LIMIT 1');
    assert.ok(unused.rows[0]);
    const free = await db.query<{ id: string }>('INSERT INTO package_options (duration_months,price_idr) VALUES ($1,0) RETURNING id', [unused.rows[0].duration]);
    freeOptionId = free.rows[0].id;
    const service = new MembershipPurchasesService(db,payments);
    const key = randomUUID();
    const once = await service.create(customerId,freeOptionId,key);
    const repeated = await service.create(customerId,freeOptionId,key);
    assert.equal(once.id,repeated.id,'Retry memakai pembelian yang sama');
    const count = await db.query<{ count: number }>('SELECT count(*)::int AS count FROM memberships WHERE purchase_id=$1', [once.id]);
    assert.equal(count.rows[0].count,1);
    process.stdout.write('Package state OK: settlement, retry idempoten, batas 30 hari, dan checkout yang ditinggalkan diuji.\n');
  } finally {
    await db.query('DELETE FROM memberships WHERE customer_id=$1', [customerId]);
    await db.query('DELETE FROM payment_transactions WHERE package_purchase_id IN (SELECT id FROM package_purchases WHERE customer_id=$1)', [customerId]);
    await db.query('DELETE FROM package_purchases WHERE customer_id=$1', [customerId]);
    if (freeOptionId) await db.query('DELETE FROM package_options WHERE id=$1', [freeOptionId]);
    await db.query('DELETE FROM app_users WHERE id=$1', [customerId]);
    await db.onModuleDestroy();
  }
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
