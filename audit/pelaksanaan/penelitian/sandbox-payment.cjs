const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {db,root,fixture,src}=require('../fixture-db.cjs');
const {api}=require('./browser-common.cjs');

module.exports=async function paySandbox(runtime,order,kind) {
  process.env.MIDTRANS_SETTINGS_KEY=require('../00/fixture-payment-key.cjs')(root,fixture.dbName);
  const {PaymentSettings}=src('payments/payment-settings');const {MidtransClient}=src('payments/midtrans');
  const credentials=await new PaymentSettings(db).credentials();
  const provider=new MidtransClient(credentials.serverKey),orderId=order.payment.orderId;
  let status=await provider.getTransactionStatus(orderId);
  if(status.transaction_status!=='settlement') {
    if(!status.va_numbers?.[0]?.va_number) {
      const snap=await runtime.context.newPage();await snap.goto(order.payment.redirectUrl);
      await snap.getByText('Virtual account',{exact:true}).click();
      await snap.locator('a[href="#/bank-transfer/bca-va"]').click();
    }
    for(let n=0;n<10;n++) {status=await provider.getTransactionStatus(orderId);if(status.va_numbers?.[0]?.va_number)break;await new Promise(r=>setTimeout(r,500));}
    assert.ok(status.va_numbers?.[0]?.va_number,'VA Sandbox tersedia');
    const simulator=await runtime.context.newPage();await simulator.goto('https://simulator.sandbox.midtrans.com/bca/va/index');
    await simulator.getByRole('textbox').fill(status.va_numbers[0].va_number);
    await simulator.getByRole('button',{name:'Inquire',exact:true}).click();
    await simulator.getByRole('button',{name:'Pay',exact:true}).click();
    for(let n=0;n<15;n++) {status=await provider.getTransactionStatus(orderId);if(status.transaction_status==='settlement')break;await new Promise(r=>setTimeout(r,700));}
  }
  assert.equal(status.transaction_status,'settlement','Pembayaran simulator benar-benar settled di Midtrans Sandbox');
  const endpoint=kind==='package' ? `/me/membership-purchases/${order.id}/refresh-payment` : kind==='event' ? `/events/registrations/${order.id}/refresh-payment` : `/bookings/${order.id}/refresh-payment`;
  const synced=await api(runtime.context,endpoint,'POST');
  assert.equal(synced.paymentStatus,'success');
  const notification={...status,signature_key:crypto.createHash('sha512').update(status.order_id+status.status_code+status.gross_amount+credentials.serverKey).digest('hex')};
  for(let n=0;n<2;n++) {
    const response=await runtime.context.request.post('http://127.0.0.1:5173/api/v1/webhooks/midtrans',{data:notification});
    assert.equal(response.status(),201,'Webhook sah diterima melalui HTTP');
  }
  const invalid=await runtime.context.request.post('http://127.0.0.1:5173/api/v1/webhooks/midtrans',{data:{...notification,signature_key:'invalid'}});
  assert.equal(invalid.status(),403);
  return {result:'PASS',provider:'Midtrans Sandbox nyata',method:'BCA VA simulator resmi',orderId,providerStatus:status.transaction_status,localStatus:synced,validWebhookReplays:2,invalidWebhookHttp:invalid.status(),delivery:'Replay HTTP lokal, bukan bukti callback otomatis dari internet'};
};
