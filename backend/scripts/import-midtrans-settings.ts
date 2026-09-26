import { Db } from '../src/shared/db';
import { PaymentSettings } from '../src/payments/payment-settings';

async function main() {
  const merchantId = process.env.MIDTRANS_MERCHANT_ID;
  const clientKey = process.env.MIDTRANS_CLIENT_KEY;
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (process.env.MIDTRANS_ENV !== 'sandbox' || !merchantId || !clientKey || !serverKey) throw new Error('Kredensial Sandbox lokal belum lengkap');
  const db = new Db();
  try {
    await new PaymentSettings(db).save({ merchantId, clientKey, serverKey });
    process.stdout.write('Pengaturan Midtrans Sandbox tersimpan terenkripsi di PostgreSQL.\n');
  } finally { await db.onModuleDestroy(); }
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : 'Impor pengaturan gagal'); process.exitCode = 1; });
