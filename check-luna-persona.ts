import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { personas, users } from './shared/schema.js';

async function checkLunaPersona() {
  try {
    // 데이터베이스 연결
    const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/perso';
    const client = postgres(connectionString);
    const db = drizzle(client);

    console.log('🔍 Luna 페르소나 정보 조회 중...\n');

    // Luna 페르소나 정보 조회
    const lunaPersonas = await db
      .select({
        personaId: personas.id,
        personaName: personas.name,
        userId: personas.userId,
        userName: users.name,
        username: users.username
      })
      .from(personas)
      .leftJoin(users, personas.userId, users.id)
      .where(personas.name, 'Luna');

    if (lunaPersonas.length === 0) {
      console.log('❌ Luna 페르소나를 찾을 수 없습니다.');
      return;
    }

    console.log('✅ Luna 페르소나 정보:');
    console.log('=====================================');
    
    lunaPersonas.forEach((persona, index) => {
      console.log(`${index + 1}. 페르소나 ID: ${persona.personaId}`);
      console.log(`   페르소나 이름: ${persona.personaName}`);
      console.log(`   사용자 ID: ${persona.userId}`);
      console.log(`   사용자 이름: ${persona.userName || 'N/A'}`);
      console.log(`   사용자명: ${persona.username || 'N/A'}`);
      console.log('-------------------------------------');
    });

    // 모든 페르소나 정보도 확인
    console.log('\n🔍 모든 페르소나 정보:');
    console.log('=====================================');
    
    const allPersonas = await db
      .select({
        personaId: personas.id,
        personaName: personas.name,
        userId: personas.userId,
        userName: users.name,
        username: users.username
      })
      .from(personas)
      .leftJoin(users, personas.userId, users.id);

    allPersonas.forEach((persona, index) => {
      console.log(`${index + 1}. ${persona.personaName} (${persona.personaId})`);
      console.log(`   소유자: ${persona.userName || 'N/A'} (${persona.username || 'N/A'})`);
      console.log('-------------------------------------');
    });

    await client.end();
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

checkLunaPersona();
