import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import mysql from 'mysql2/promise';

const root = resolve(import.meta.dirname, '..');
const schemaSql = readFileSync(resolve(root, 'database/schema.sql'), 'utf8');
const seedSql = readFileSync(resolve(root, 'database/seed.sql'), 'utf8');

const config = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  multipleStatements: true,
  charset: 'utf8mb4'
};

try {
  const connection = await mysql.createConnection(config);
  await connection.query(schemaSql);
  await connection.query(seedSql);
  const [tables] = await connection.query(
    'SELECT table_name FROM information_schema.tables WHERE table_schema = ? ORDER BY table_name',
    [process.env.MYSQL_DATABASE || 'repair_system']
  );
  await connection.end();
  console.log(
    JSON.stringify({
      ok: true,
      database: process.env.MYSQL_DATABASE || 'repair_system',
      tableCount: tables.length,
      tables: tables.map((item) => item.TABLE_NAME || item.table_name)
    })
  );
} catch (error) {
  console.error(
    JSON.stringify({
      ok: false,
      code: error.code,
      message: error.message
    })
  );
  process.exit(1);
}
