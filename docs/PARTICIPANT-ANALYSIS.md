# 참가자(Participant) 개념 분석 보고서

## 📋 요청 사항
> 1. 현재 참가자는 두 종류인지 확인 (사용자 / 페르소나)
> 2. 각 그룹별로 입장 상태 확인
> 3. 페르소나는 입장 시 소개 메시지 자동 노출 되는지 확인

---

## 🔍 1. 참가자 타입 확인

### ✅ **참가자는 정확히 두 종류입니다!**

#### 데이터베이스 스키마 (`shared/schema.ts`)

```typescript
export const conversationParticipants = pgTable("conversation_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull(),
  participantType: varchar("participant_type", { length: 20 }).notNull(),  // ← 여기!
  participantId: varchar("participant_id").notNull(),
  role: varchar("role", { length: 20 }).notNull().default('member'),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  lastReadMessageId: varchar("last_read_message_id"),
  isActive: boolean("is_active").notNull().default(true),
});
```

#### 참가자 타입 (`participantType`)
- **`'user'`** - 실제 사용자
- **`'persona'`** - AI 페르소나

---

## 📊 2. 현재 참가자 현황 분석

### 전체 통계 (2025-10-08 기준)

```
📊 전체 참가자 수: 13명

📋 참가자 타입별 분류:
   👤 사용자 (user): 3명
   🤖 페르소나 (persona): 10명
   ❓ 기타 타입: 0개 ✅

👑 역할(role)별 분류:
   👑 방장 (owner): 2명
   🛡️  모더레이터 (moderator): 0명
   👥 일반 멤버 (member): 11명

✅ 활성 상태별 분류:
   ✅ 활성 (isActive=true): 13명
   ❌ 비활성 (isActive=false): 0명
```

### 대화방별 참가자 분석

#### 대화방 1: "개발자 컨퍼런스"
```
총 참가자: 8명
  👤 사용자: 2명
  🤖 페르소나: 6명
  👑 방장: 1명 (페르소나)
```

#### 대화방 2: "베이킹"
```
총 참가자: 5명
  👤 사용자: 1명
  🤖 페르소나: 4명
  👑 방장: 1명 (페르소나)
```

---

## 👤 3. 사용자 그룹 상세 분석

### 기본 통계
```
총 사용자 참가자: 3명

역할 분포:
  👑 방장: 0명
  🛡️  모더레이터: 0명
  👥 일반 멤버: 3명

상태 분포:
  ✅ 활성: 3명
  ❌ 비활성: 0명
```

### 사용자 입장 프로세스

#### 입장 처리 (`server/websocket.ts`)

```typescript
socket.on("join:conversation", async (conversationId: string, action: string = 'refresh') => {
  // 새로고침인 경우 아무것도 하지 않음
  if (action === 'refresh') {
    return;
  }
  
  // 실제 입장인 경우에만 처리
  if (action === 'join') {
    // 1. 사용자를 participant로 추가
    await storage.addParticipant({
      conversationId,
      participantType: 'user',
      participantId: userId,
      role: 'member',
    });
    
    // 2. 입장 메시지 생성
    const userContent = `👤 ${displayName}님이 입장했습니다`;
    
    // 3. 데이터베이스에 저장
    await storage.createMessageInConversation({
      conversationId,
      senderType: 'system',
      senderId: userId,
      content: userContent,
      messageType: 'join',
    });
  }
});
```

#### 특징
- ✅ **입장 시 자동으로 `participant`로 추가됨**
- ✅ **입장 메시지 자동 생성** (`👤 사용자명님이 입장했습니다`)
- ✅ **중복 입장 메시지 방지** (1분 이내 재입장 시)
- ✅ **새로고침과 실제 입장 구분**
- ⚠️ **모든 사용자는 `'member'` 역할로 추가됨** (방장 아님)

---

## 🤖 4. 페르소나 그룹 상세 분석

### 기본 통계
```
총 페르소나 참가자: 10명

역할 분포:
  👑 방장: 2명
  🛡️  모더레이터: 0명
  👥 일반 멤버: 8명

상태 분포:
  ✅ 활성: 10명
  ❌ 비활성: 0명
```

### 페르소나 입장 프로세스

#### 1. 초기 대화방 생성 시 (`server/storage.ts`)

```typescript
async createConversationForPost(postId: string, ...): Promise<Conversation> {
  // 대화방 생성
  const conversation = await db.insert(conversations).values({...}).returning();
  
  // 게시물 작성자의 페르소나를 자동으로 방장으로 추가
  const post = await this.getPost(postId);
  if (post) {
    const authorPersona = await this.getPersonaByUserId(post.userId);
    if (authorPersona) {
      await db.insert(conversationParticipants).values({
        conversationId: conversation.id,
        participantType: 'persona',
        participantId: authorPersona.id,
        role: 'owner',  // ← 방장으로 설정!
      });
    }
  }
  
  return conversation;
}
```

**특징:**
- ✅ **게시물 작성자의 페르소나는 자동으로 `'owner'` 역할**
- ✅ **대화방 생성 시 자동으로 참가자로 추가됨**

#### 2. 초기 대화 시작 시 (`server/engine/multiAgentDialogueOrchestrator.ts`)

```typescript
export async function multiAgentDialogueOrchestrator(post: Post, ...): Promise<...> {
  // 페르소나 선택
  const selectedPersonas = initialPersonas || await selectInitialPersonas(contexts);
  
  // 초기 대화 진행 (3-6턴)
  for (let turn = 0; turn < initialTurns; turn++) {
    const nextSpeaker = selectNextSpeaker(...);
    const message = await personaTalk(nextSpeaker, post, analysis, personaContext);
    
    // 메시지만 저장, 참가자 추가는 하지 않음!
    await storage.createMessageInConversation({
      conversationId: conversation.id,
      senderType: 'persona',
      senderId: nextSpeaker,
      content: message,
      messageType: 'text',
    });
  }
}
```

**문제점 발견!**
- ⚠️ **페르소나가 메시지를 보내지만 `participant`로 추가되지 않음!**
- ⚠️ **초기 대화 시작 시 참가자 등록이 없음**

#### 3. 입장/퇴장 이벤트 (`server/engine/joinLeaveManager.ts`)

```typescript
export async function generateAutoIntroduction(
  personaId: string,
  currentTopics: string[]
): Promise<string> {
  const persona = await storage.getPersona(personaId);
  
  const prompt = `You are ${persona.name}, joining a conversation.
  
Your characteristics:
- Name: ${persona.name}
- Description: ${persona.description || 'A helpful AI persona'}

Current conversation topics: ${topicList}

Generate a brief, natural introduction (1 sentence) as you join the conversation.

Output only the introduction in Korean, nothing else.`;

  const intro = await openai.chat.completions.create({...});
  return intro; // 예: "안녕하세요, Rho입니다! 기술과 AI에 대해 이야기해보고 싶네요."
}

export async function executeJoinLeaveEvents(events: JoinLeaveEvent[]): Promise<void> {
  for (const event of events) {
    if (event.eventType === 'join') {
      persoRoomManager.addPersona(event.roomId, event.personaId);
      
      // 자동 소개 메시지 생성
      event.autoIntroduction = await generateAutoIntroduction(...);
      console.log(`[JOIN] ${event.personaId} joined: "${event.autoIntroduction}"`);
    }
  }
}
```

**특징:**
- ✅ **페르소나 입장 시 AI로 소개 메시지 자동 생성**
- ✅ **현재 대화 토픽을 고려한 맞춤형 소개**
- ✅ **페르소나의 성격에 맞는 자연스러운 한 문장 소개**

**하지만 문제점:**
- ❌ **소개 메시지는 생성되지만 데이터베이스에 저장되지 않음!**
- ❌ **`participant`로 추가되지 않음!**
- ❌ **소개 메시지가 실제로 UI에 표시되지 않음!**

---

## 🔍 5. 페르소나 소개 메시지 자동 노출 검증

### ✅ 소개 메시지 생성 로직은 존재합니다!

**위치:** `server/engine/joinLeaveManager.ts`
- `generateAutoIntroduction()` 함수로 AI 기반 소개 메시지 생성
- 페르소나의 특성과 현재 토픽을 고려한 자연스러운 소개
- OpenAI GPT-4o-mini 모델 사용

### ❌ 하지만 실제로 노출되지 않습니다!

**문제점:**

1. **소개 메시지가 데이터베이스에 저장되지 않음**
   ```typescript
   // joinLeaveManager.ts에서 소개 메시지 생성
   event.autoIntroduction = await generateAutoIntroduction(...);
   
   // 하지만 이 메시지를 DB에 저장하는 코드가 없음!
   // storage.createMessageInConversation()을 호출하지 않음
   ```

2. **페르소나가 `participant`로 추가되지 않음**
   ```typescript
   // persoRoomManager.addPersona()는 메모리상 room에만 추가
   // DB의 conversationParticipants 테이블에는 추가되지 않음!
   ```

3. **WebSocket으로 브로드캐스트되지 않음**
   - 소개 메시지가 생성되지만 클라이언트로 전송되지 않음
   - UI에서 확인할 수 없음

---

## 📊 6. 결론

### ✅ 확인된 사항

1. **참가자는 두 종류입니다**
   - ✅ 사용자 (`user`)
   - ✅ 페르소나 (`persona`)
   - ✅ 기타 타입 없음

2. **각 그룹별 입장 상태**
   
   **사용자:**
   - ✅ 입장 시 자동으로 `participant`로 추가됨
   - ✅ 입장 메시지 자동 생성 및 저장
   - ✅ WebSocket으로 브로드캐스트
   - ✅ UI에 표시됨
   
   **페르소나:**
   - ✅ 게시물 작성자의 페르소나는 방장으로 자동 추가됨
   - ⚠️ 다른 페르소나는 메시지를 보내지만 `participant`로 추가되지 않음
   - ⚠️ 참가자 테이블에 기록되지 않음

3. **페르소나 소개 메시지**
   - ✅ 소개 메시지 생성 로직 존재
   - ✅ AI 기반 맞춤형 소개
   - ❌ **데이터베이스에 저장되지 않음**
   - ❌ **UI에 표시되지 않음**
   - ❌ **WebSocket 브로드캐스트 없음**

---

## 🛠️ 7. 개선 필요 사항

### 우선순위 1: 페르소나 참가자 등록

**문제:**
- 페르소나가 메시지를 보내도 `conversationParticipants` 테이블에 추가되지 않음

**해결 방안:**
```typescript
// multiAgentDialogueOrchestrator.ts에서 메시지 저장 전에
await storage.addParticipant({
  conversationId: conversation.id,
  participantType: 'persona',
  participantId: nextSpeaker,
  role: 'member',
});
```

### 우선순위 2: 소개 메시지 DB 저장 및 브로드캐스트

**문제:**
- 소개 메시지가 생성되지만 DB에 저장되지 않고 UI에 표시되지 않음

**해결 방안:**
```typescript
// joinLeaveManager.ts의 executeJoinLeaveEvents에서
if (event.eventType === 'join' && event.autoIntroduction) {
  // DB에 소개 메시지 저장
  await storage.createMessageInConversation({
    conversationId,
    senderType: 'system',
    senderId: event.personaId,
    content: `🤖 ${personaName}: ${event.autoIntroduction}`,
    messageType: 'join',
  });
  
  // WebSocket 브로드캐스트
  io.to(`conversation:${conversationId}`).emit('message:system', {
    ...messageData
  });
}
```

### 우선순위 3: 일관성 있는 참가자 관리

**현재 문제:**
- 사용자는 입장 시 즉시 `participant` 추가
- 페르소나는 메시지 발송 시점에도 추가되지 않음

**해결 방안:**
- 모든 발화자를 메시지 발송 전에 `participant`로 자동 추가
- 마이그레이션 스크립트로 기존 메시지 발신자들을 소급 등록

---

## 📁 생성된 파일

- `server/scripts/analyze-participants.ts` - 참가자 분석 스크립트
- `docs/PARTICIPANT-ANALYSIS.md` - 본 문서

## 🔧 사용 가능한 명령어

```bash
# 참가자 현황 분석
npm run analyze:participants
```

---

**작성일**: 2025-10-08  
**상태**: ✅ 분석 완료, 개선 필요 사항 식별

