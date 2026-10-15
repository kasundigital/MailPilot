import mysql from 'mysql2/promise';

export let pool;
if (process.env.NODE_ENV === 'test') {
  pool = { query: async () => [[]] }; // mock pool
} else {
  pool = mysql.createPool({host:process.env.DB_HOST||'db',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'mailpilot',password:process.env.DB_PASSWORD,database:process.env.DB_NAME||'mailpilot',waitForConnections:true,connectionLimit:10,dateStrings:true});
}

export async function init(){const statements=[
`CREATE TABLE IF NOT EXISTS accounts (id INT AUTO_INCREMENT PRIMARY KEY,label VARCHAR(120) NOT NULL,host VARCHAR(255) NOT NULL,port INT NOT NULL,secure BOOLEAN NOT NULL DEFAULT FALSE,username VARCHAR(255) NOT NULL,password_cipher TEXT NOT NULL,from_name VARCHAR(120) NOT NULL,from_email VARCHAR(254) NOT NULL,per_minute INT NOT NULL,per_hour INT NOT NULL,per_day INT NOT NULL,enabled BOOLEAN NOT NULL DEFAULT TRUE,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
`CREATE TABLE IF NOT EXISTS contacts (id BIGINT AUTO_INCREMENT PRIMARY KEY,email VARCHAR(254) NOT NULL UNIQUE,subscribed BOOLEAN NOT NULL DEFAULT TRUE,consent_source VARCHAR(255) NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,unsubscribed_at DATETIME NULL)`,
`CREATE TABLE IF NOT EXISTS campaigns (id BIGINT AUTO_INCREMENT PRIMARY KEY,account_id INT NOT NULL,subject VARCHAR(255) NOT NULL,html MEDIUMTEXT NOT NULL,plain MEDIUMTEXT NOT NULL,status ENUM('draft','running','paused','completed') DEFAULT 'draft',created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY (account_id) REFERENCES accounts(id))`,
`CREATE TABLE IF NOT EXISTS messages (id BIGINT AUTO_INCREMENT PRIMARY KEY,campaign_id BIGINT NOT NULL,contact_id BIGINT NOT NULL,status ENUM('queued','sending','sent','failed','suppressed') DEFAULT 'queued',attempts INT DEFAULT 0,next_attempt DATETIME DEFAULT CURRENT_TIMESTAMP,sent_at DATETIME NULL,last_error VARCHAR(1000) NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,UNIQUE KEY campaign_contact(campaign_id,contact_id),INDEX message_work(status,next_attempt),FOREIGN KEY(campaign_id) REFERENCES campaigns(id),FOREIGN KEY(contact_id) REFERENCES contacts(id))`
];for(const s of statements)await pool.query(s)}
