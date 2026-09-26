import { randomUUID } from 'node:crypto';
import { MidtransClient } from '../src/payments/midtrans';
import { Db } from '../src/shared/db';
import { PaymentSettings } from '../src/payments/payment-settings';

async function main() {
  if (process.env.MIDTRANS_ENV !== 'sandbox') throw new Error('Pemeriksaan ini hanya berjalan di Sandbox');
  const orderId = `wellness-check-${randomUUID().slice(0, 8)}`;
  const db = new Db();
  try {
    const { serverKey } = await new PaymentSettings(db).credentials();
    const midtrans = new MidtransClient(serverKey);
    const result = await midtrans.createSnapTransaction(orderId, 10000, 15);
    process.stdout.write(JSON.stringify({ orderId, tokenReceived: Boolean(result.token), redirectHost: new URL(result.redirect_url).hostname }) + '\n');
  } finally { await db.onModuleDestroy(); }
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : 'Pemeriksaan Midtrans gagal'); process.exitCode = 1; });
