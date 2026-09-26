import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

async function main() {
  const server = spawn(process.execPath,[resolve(__dirname,'server.js')], { stdio: ['pipe','pipe','pipe'] });
  let buffer = '';
  let nextId = 0;
  const pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  server.stdout.setEncoding('utf8');
  server.stdout.on('data',(chunk: string) => {
    buffer += chunk;
    while (buffer.includes('\n')) {
      const end = buffer.indexOf('\n');
      const line = buffer.slice(0,end);
      buffer = buffer.slice(end+1);
      if (!line.trim()) continue;
      const message = JSON.parse(line) as { id?: number; result?: unknown; error?: unknown };
      if (message.id === undefined) continue;
      const request = pending.get(message.id);
      if (!request) continue;
      pending.delete(message.id);
      if (message.error) request.reject(new Error(JSON.stringify(message.error)));
      else request.resolve(message.result);
    }
  });
  function call(method: string, params: unknown): Promise<unknown> {
    const id = ++nextId;
    return new Promise((resolve,reject) => {
      pending.set(id,{resolve,reject});
      server.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');
    });
  }
  const timeout = setTimeout(() => { server.kill(); process.stderr.write('MCP smoke timeout\n'); process.exitCode = 1; },20000);
  try {
    await call('initialize',{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'wellness-smoke',version:'1'}});
    server.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');
    const tools = await call('tools/list',{}) as { tools: { name: string }[] };
    assert.ok(tools.tools.some((tool) => tool.name === 'wellness_create_booking'));
    assert.ok(tools.tools.some((tool) => tool.name === 'wellness_cancel_pending_package'));
    const result = await call('tools/call',{name:'wellness_list_sessions',arguments:{page:1}}) as { isError?: boolean; content: { text: string }[] };
    assert.equal(result.isError,undefined,result.content[0]?.text);
    const sessions = JSON.parse(result.content[0].text) as { id: string; level: string; singlePriceIdr: number; seatsLeft: number }[];
    assert.ok(Array.isArray(sessions));
    process.stdout.write(`MCP terhubung: ${tools.tools.length} tool; daftar sesi API terbaca.\n`);
    if (process.argv.includes('--checkout')) {
      const session = sessions.find((row) => row.level === 'beginner' && row.singlePriceIdr > 0 && row.seatsLeft > 0);
      assert.ok(session,'Tidak ada kelas pemula berbayar dengan kursi tersedia');
      const created = await call('tools/call',{name:'wellness_create_booking',arguments:{sessionId:session.id,paymentChoice:'single',useBalance:false,idempotencyKey:`mcp-smoke-${randomUUID()}`}}) as { isError?: boolean; content: { text: string }[] };
      assert.equal(created.isError,undefined,created.content[0]?.text);
      const booking = JSON.parse(created.content[0].text) as { id: string; status: string; payment?: { orderId: string } };
      assert.equal(booking.status,'pending_payment');
      assert.ok(booking.payment?.orderId);
      const refreshed = await call('tools/call',{name:'wellness_refresh_booking_payment',arguments:{bookingId:booking.id}}) as { isError?: boolean; content: { text: string }[] };
      assert.equal(refreshed.isError,undefined,refreshed.content[0]?.text);
      const cancelled = await call('tools/call',{name:'wellness_cancel_pending_booking',arguments:{bookingId:booking.id}}) as { isError?: boolean; content: { text: string }[] };
      assert.equal(cancelled.isError,undefined,cancelled.content[0]?.text);
      assert.equal((JSON.parse(cancelled.content[0].text) as { status: string }).status,'cancelled');
      process.stdout.write('Booking berbayar Sandbox dibuat, status diperiksa, lalu booking pending dibatalkan.\n');
    }
  } finally {
    clearTimeout(timeout);
    server.kill();
  }
}

void main().catch((error: unknown) => { process.stderr.write(`${error instanceof Error ? error.message : 'Smoke gagal'}\n`); process.exitCode = 1; });
