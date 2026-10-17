import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { pool } from './db.js';

const BACKUP_DIR = path.join(process.cwd(), 'backups');

export async function createBackup(encryptionKey) {
  await fs.mkdir(BACKUP_DIR, { recursive: true });

  const tables = [
    'accounts', 'contacts', 'campaigns', 'messages',
    'campaign_audience', 'contact_tags', 'audit_logs'
  ];

  const backupData = {
    version: '1',
    timestamp: new Date().toISOString(),
    data: {}
  };

  for (const table of tables) {
    const [rows] = await pool.query(`SELECT * FROM ${table}`);
    backupData.data[table] = rows;
  }

  const json = JSON.stringify(backupData);

  const iv = crypto.randomBytes(16);
  const key = crypto.createHash('sha256').update(encryptionKey).digest();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const finalPayload = Buffer.concat([iv, authTag, encrypted]);

  const filename = `backup_${Date.now()}.enc`;
  const filepath = path.join(BACKUP_DIR, filename);

  await fs.writeFile(filepath, finalPayload);
  return { filename, size: finalPayload.length, timestamp: backupData.timestamp };
}

export async function listBackups() {
  await fs.mkdir(BACKUP_DIR, { recursive: true });
  const files = await fs.readdir(BACKUP_DIR);
  const backups = [];

  for (const file of files) {
    if (file.endsWith('.enc')) {
      const stat = await fs.stat(path.join(BACKUP_DIR, file));
      const parts = file.split('_');
      const ts = parts.length > 1 ? parseInt(parts[1].split('.')[0], 10) : stat.mtimeMs;
      backups.push({
        filename: file,
        size: stat.size,
        timestamp: new Date(ts).toISOString()
      });
    }
  }

  return backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

export async function restoreBackup(filename, encryptionKey, dryRun = false) {
  const filepath = path.join(BACKUP_DIR, filename);
  const fileData = await fs.readFile(filepath);

  const key = crypto.createHash('sha256').update(encryptionKey).digest();
  const iv = fileData.subarray(0, 16);
  const authTag = fileData.subarray(16, 32);
  const encrypted = fileData.subarray(32);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let json;
  try {
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    json = decrypted.toString('utf8');
  } catch (err) {
    throw new Error('Invalid encryption key or corrupt backup file');
  }

  const backupData = JSON.parse(json);
  const results = { dryRun, logs: [] };

  const tables = [
    'audit_logs', 'contact_tags', 'campaign_audience',
    'messages', 'campaigns', 'contacts', 'accounts'
  ];

  for (const table of backupData.data ? Object.keys(backupData.data) : []) {
    const rows = backupData.data[table];
    if (rows && rows.length > 0) {
      const cols = Object.keys(rows[0]);
      const logMsg = `Would restore ${rows.length} rows to ${table}`;
      results.logs.push(logMsg);
    } else {
      results.logs.push(`No data to restore for ${table}`);
    }
  }

  if (!dryRun) {
    const conn = await pool.getConnection();
    try {
      await conn.query('SET FOREIGN_KEY_CHECKS = 0');

      const clearTables = [
        'audit_logs', 'contact_tags', 'campaign_audience',
        'messages', 'campaigns', 'contacts', 'accounts'
      ];
      for(const t of clearTables) {
         if (backupData.data[t]) {
           await conn.query(`TRUNCATE TABLE ${t}`);
         }
      }

      for (const table of ['accounts', 'contacts', 'campaigns', 'messages', 'campaign_audience', 'contact_tags', 'audit_logs']) {
        const rows = backupData.data[table];
        if (rows && rows.length > 0) {
          const cols = Object.keys(rows[0]);
          for (let i = 0; i < rows.length; i += 100) {
            const chunk = rows.slice(i, i + 100);
            const placeholders = chunk.map(() => '(' + cols.map(() => '?').join(',') + ')').join(',');
            const values = chunk.flatMap(r => cols.map(c => r[c]));
            await conn.query(`INSERT INTO ${table} (${cols.join(',')}) VALUES ${placeholders}`, values);
          }
        }
      }
    } finally {
      await conn.query('SET FOREIGN_KEY_CHECKS = 1');
      conn.release();
    }
  }

  return results;
}
