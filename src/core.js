import crypto from 'node:crypto';
export function normalizeEmail(value){const s=String(value||'').trim().toLowerCase();return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(s)&&s.length<=254?s:null}
export function parseEmails(raw){return [...new Set(String(raw||'').split(/[\s,;]+/).map(normalizeEmail).filter(Boolean))]}
export function encrypt(text, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
  const ciphertext = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);

  return [
    iv.toString('hex'),
    cipher.getAuthTag().toString('hex'),
    ciphertext.toString('hex')
  ].join(':');
}

export function decrypt(value, key) {
  const [iv, tag, data] = value.split(':');
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(key, 'hex'),
    Buffer.from(iv, 'hex')
  );

  decipher.setAuthTag(Buffer.from(tag, 'hex'));

  return Buffer.concat([
    decipher.update(Buffer.from(data, 'hex')),
    decipher.final()
  ]).toString('utf8');
}
export function signUnsubscribe(id,email,secret){return crypto.createHmac('sha256',secret).update(id+':'+email).digest('hex')}
export function validSignature(id,email,signature,secret){if(!/^[0-9a-f]{64}$/.test(signature||''))return false;const a=Buffer.from(signUnsubscribe(id,email,secret),'hex');const b=Buffer.from(signature,'hex');return crypto.timingSafeEqual(a,b)}
export function safeLimits(input) {
  const parseLimit = (n) => {
    const num = Number(n);
    if (Number.isInteger(num) && num > 0 && num <= 100000) {
      return num;
    }
    return null;
  };

  const min = parseLimit(input.perMinute);
  const hour = parseLimit(input.perHour);
  const day = parseLimit(input.perDay);

  if (!min || !hour || !day || hour < min || day < hour) {
    throw Error('Valid positive limits required: daily >= hourly >= minute');
  }

  return { perMinute: min, perHour: hour, perDay: day };
}
