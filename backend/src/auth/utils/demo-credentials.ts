import { createHash } from 'node:crypto';

// Fingerprint credential demo yang telah dipublikasikan. Jangan izinkan login/sesi lama.
const compromisedFingerprint = 'b57b22e4d161066edfb8c8e1075d759dd3aa0b30ea5cbcb415542b36b629eba7';

export function isCompromisedDemoHash(hash: string): boolean {
  return createHash('sha256').update(hash).digest('hex') === compromisedFingerprint;
}
