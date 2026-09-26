import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

type DemoAccount = { email: string; role: string; password: string };

function baseUrl(): URL {
  const url = new URL(process.env.WELLNESS_MCP_API_URL ?? 'http://127.0.0.1:3000');
  if (url.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.username || url.password || url.pathname !== '/') {
    throw new Error('MCP hanya boleh mengakses backend HTTP lokal');
  }
  return url;
}

export class WellnessApi {
  private readonly origin = baseUrl();
  private cookie = '';
  private csrf = '';
  private readonly email = process.env.WELLNESS_MCP_ACCOUNT ?? 'ayu.lestari@sora.example.test';

  private async password(): Promise<string> {
    if (process.env.WELLNESS_MCP_PASSWORD) return process.env.WELLNESS_MCP_PASSWORD;
    const file = process.env.WELLNESS_DEMO_ACCOUNTS_FILE ?? resolve(__dirname, '../../../.qa/demo-accounts.json');
    const parsed = JSON.parse(await readFile(file, 'utf8')) as { accounts: DemoAccount[] };
    const account = parsed.accounts.find((row) => row.email === this.email && row.role === 'customer');
    if (!account) throw new Error('Akun pelanggan tidak ditemukan dalam file sandi demo lokal');
    return account.password;
  }

  private async send(method: string, path: string, body?: unknown, key?: string): Promise<unknown> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (this.cookie) headers.Cookie = this.cookie;
    if (method !== 'GET') headers['x-csrf-token'] = this.csrf;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (key) headers['Idempotency-Key'] = key;
    const response = await fetch(new URL(`/api/v1/${path}`, this.origin), {
      method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000),
    });
    for (const cookie of response.headers.getSetCookie()) {
      if (cookie.startsWith('wellness.sid=')) this.cookie = cookie.split(';', 1)[0];
    }
    const data = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) throw new Error(`API wellness HTTP ${response.status}: ${JSON.stringify(data)}`);
    return data;
  }

  private async login() {
    const initial = await this.send('GET', 'auth/csrf') as { token: string };
    this.csrf = initial.token;
    await this.send('POST', 'auth/login', { email: this.email, password: await this.password() });
    this.csrf = (await this.send('GET', 'auth/csrf') as { token: string }).token;
  }

  async request(method: string, path: string, body?: unknown, key?: string): Promise<unknown> {
    if (!this.csrf) await this.login();
    try { return await this.send(method, path, body, key); }
    catch (error) {
      if (!(error instanceof Error) || !error.message.includes('HTTP 401:')) throw error;
      this.cookie = '';
      this.csrf = '';
      await this.login();
      return this.send(method, path, body, key);
    }
  }
}
