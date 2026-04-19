import { Pool } from 'pg';

// Cloud Run uses Unix socket via Cloud SQL proxy; local dev uses TCP
const INSTANCE_CONNECTION_NAME = process.env.INSTANCE_CONNECTION_NAME;

const poolConfig = INSTANCE_CONNECTION_NAME
  ? {
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || 'tradeson-mvp-2026',
      database: process.env.DB_NAME || 'tradeson_app',
      host: `/cloudsql/${INSTANCE_CONNECTION_NAME}`,
      max: 5,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
    }
  : {
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    };

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected PG pool error:', err);
});

pool.query('SELECT 1').then(() => {
  console.log('PostgreSQL connected' + (INSTANCE_CONNECTION_NAME ? ' (Cloud SQL proxy)' : ' (TCP)'));
}).catch((err) => {
  console.error('PostgreSQL connection failed:', err.message);
});

export default pool;
