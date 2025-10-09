import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20, // 최대 연결 수
  idleTimeoutMillis: 30000, // 유휴 연결 타임아웃
  connectionTimeoutMillis: 2000, // 연결 타임아웃
  acquireTimeoutMillis: 10000, // 연결 획득 타임아웃
  createTimeoutMillis: 5000, // 연결 생성 타임아웃
});
export const db = drizzle({ client: pool, schema });

// 데이터베이스 연결 상태 확인
export async function checkDatabaseConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('[DB] 데이터베이스 연결 성공:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('[DB] 데이터베이스 연결 실패:', error);
    return false;
  }
}
