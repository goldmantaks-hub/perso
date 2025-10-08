# 🔥 중대한 버그 수정: Persona ID vs Name 혼동 문제

## 🐛 발견된 버그

사용자 보고: "Luna 토글을 누르면 Unknown 페르소나가 초대됨"

### 근본 원인

서버 API가 **페르소나 이름**과 **페르소나 UUID**를 혼동하여 사용하고 있었습니다!

```typescript
// ❌ 잘못된 코드 (이전)
app.post("/api/perso/:postId/persona/:personaId/join", async (req, res) => {
  const { personaId } = req.params;  // 이것은 "Luna" 또는 UUID일 수 있음
  
  // personaId로 조회 (이름이면 실패, UUID면 성공)
  let persona = await storage.getPersona(personaId);
  
  // ⚠️ 문제: personaId를 그대로 사용!
  await storage.addParticipant({
    participantId: personaId,  // "Luna"를 participant_id에 저장?!
  });
  
  await generateAutoIntroduction(personaId, currentTopics);  // "Luna"로 조회?!
  
  await storage.createMessageInConversation({
    senderId: personaId,  // "Luna"를 sender_id에 저장?!
  });
});
```

### 문제점

1. **`personaId` 파라미터가 이름("Luna")인 경우:**
   - `storage.getPersona(personaId)` → 실패 (UUID가 아님)
   - 이름으로 재조회 → 성공, `persona` 객체 획득
   - **BUT!** 이후 코드에서 `personaId`(이름)를 계속 사용
   - `participantId: "Luna"` → DB에 이름 저장 (UUID 대신!)
   - `senderId: "Luna"` → 메시지의 발신자가 이름으로 저장
   - 나중에 participant 조회 시 UUID로 persona를 찾을 수 없음 → `Unknown`

2. **데이터 무결성 문제:**
   - `conversation_participants.participant_id` = "Luna" (이름)
   - `personas.id` = "807ed04e-c5c4-486..." (UUID)
   - JOIN 불가능! → persona 정보 조회 실패 → `name: undefined`

## ✅ 수정 사항

### 1. Participant 추가 수정

```typescript
// ✅ 올바른 코드
await storage.addParticipant({
  conversationId: conversation.id,
  participantType: 'persona',
  participantId: persona.id,  // ✅ UUID 사용!
  role: 'member',
});
```

### 2. AI 소개 메시지 생성 수정

```typescript
// ✅ 올바른 코드
introMessage = await generateAutoIntroduction(
  persona.id,  // ✅ UUID 사용!
  currentTopics
);
```

### 3. 메시지 저장 수정

```typescript
// ✅ 올바른 코드
const joinMessage = await storage.createMessageInConversation({
  conversationId: conversation.id,
  senderType: 'system',
  senderId: persona.id,  // ✅ UUID 사용!
  content: `🤖 ${persona.name}: ${introMessage}`,
  messageType: 'join',
});
```

### 4. WebSocket 이벤트 수정

```typescript
// ✅ 올바른 코드
io.to(`conversation:${conversation.id}`).emit('persona:event', {
  type: 'join',
  personaId: persona.id,  // ✅ UUID 사용!
  personaName: persona.name,
  timestamp: Date.now(),
  autoIntroduction: introMessage,
});
```

## 📊 수정 전후 비교

### 수정 전 (잘못된 데이터)

```sql
-- conversation_participants 테이블
participant_id: "Luna"  -- ❌ 이름 (잘못됨!)

-- messages 테이블
sender_id: "Luna"  -- ❌ 이름 (잘못됨!)

-- 조회 시:
SELECT * FROM personas WHERE id = 'Luna'  -- ❌ 결과 없음!
→ name: undefined
→ UI에 "Unknown" 표시
```

### 수정 후 (올바른 데이터)

```sql
-- conversation_participants 테이블
participant_id: "807ed04e-c5c4-486..."  -- ✅ UUID (올바름!)

-- messages 테이블
sender_id: "807ed04e-c5c4-486..."  -- ✅ UUID (올바름!)

-- 조회 시:
SELECT * FROM personas WHERE id = '807ed04e-c5c4-486...'  -- ✅ 성공!
→ name: "Luna"
→ UI에 "Luna" 표시
```

## 🎯 영향 범위

### 영향받는 기능

1. ✅ **페르소나 강제 입장** (`POST /api/perso/:postId/persona/:personaId/join`)
2. ✅ **Participant 테이블 무결성**
3. ✅ **메시지 발신자 정보**
4. ✅ **WebSocket 이벤트**

### 영향받지 않는 기능

- 기존에 UUID로 정상 등록된 participants
- UUID를 파라미터로 전달하는 경우 (원래 정상 작동)

## 🧹 데이터 정리 필요 여부

### 확인 필요

기존에 이름으로 저장된 잘못된 데이터가 있는지 확인:

```sql
-- 이름으로 저장된 participant 찾기
SELECT * FROM conversation_participants 
WHERE participant_type = 'persona' 
AND participant_id NOT LIKE '%-%-%-%-%';  -- UUID 형식이 아닌 것

-- 이름으로 저장된 메시지 찾기
SELECT * FROM messages 
WHERE sender_type = 'persona' 
AND sender_id NOT LIKE '%-%-%-%-%';  -- UUID 형식이 아닌 것
```

### 정리 스크립트 (필요시)

```typescript
// server/scripts/fix-persona-names.ts
// 이름으로 저장된 데이터를 UUID로 수정
```

## 🔍 테스트 시나리오

1. **Luna 페르소나 클릭**
   - ✅ personaId = "Luna" (이름) → 서버에서 이름으로 조회 → persona 객체 획득
   - ✅ `persona.id` (UUID) 사용하여 participant 추가
   - ✅ `persona.id` (UUID) 사용하여 메시지 저장
   - ✅ UI에 "Luna" 정상 표시

2. **직접 UUID로 클릭 (API 테스트)**
   - ✅ personaId = "807ed04e..." (UUID) → 서버에서 UUID로 조회 → persona 객체 획득
   - ✅ `persona.id` (UUID) 사용하여 participant 추가
   - ✅ 정상 작동

3. **존재하지 않는 이름/UUID**
   - ✅ 404 에러 반환: "페르소나를 찾을 수 없습니다: [ID]"

## 📝 교훈

### 원칙

1. **항상 UUID를 사용하여 데이터 저장**
   - 이름은 표시용
   - UUID는 데이터 무결성용

2. **파라미터와 실제 ID 구분**
   - `const { personaId } = req.params` ← 사용자 입력 (이름 또는 UUID)
   - `persona.id` ← 실제 UUID (DB 저장용)

3. **변수 이름의 중요성**
   - `personaIdOrName` vs `personaUuid`
   - 명확한 의도 전달

### 개선 방향

```typescript
// 더 명확한 코드
const { personaIdOrName } = req.params;

// 조회
const persona = await findPersonaByIdOrName(personaIdOrName);

// 사용
const personaUuid = persona.id;  // 명확!
await storage.addParticipant({
  participantId: personaUuid,
});
```

## 🚀 배포 체크리스트

- [x] 서버 코드 수정
- [x] 로그 추가 (UUID 출력)
- [x] 서버 재시작
- [ ] 기존 잘못된 데이터 확인
- [ ] 필요시 데이터 정리 스크립트 실행
- [ ] UI 테스트 (Luna 클릭)
- [ ] 브라우저 콘솔 확인
- [ ] 서버 로그 확인

---

**수정 날짜:** 2025-10-08  
**파일:** `server/routes.ts`  
**라인:** 1240, 1274, 1285, 1314  
**심각도:** 🔴 Critical (데이터 무결성 문제)  
**상태:** ✅ 수정 완료


