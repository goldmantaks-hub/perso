# 페르소나 강제 입장 기능 구현 완료

## 📋 구현 개요

페르소나를 클릭하면 서버 API를 통해 강제로 대화방에 입장시키고, AI 기반 소개 메시지를 생성하여 DB에 저장 및 WebSocket으로 브로드캐스트하는 기능을 구현했습니다.

## 🎯 주요 변경사항

### 1. 서버 API 엔드포인트 추가

**파일:** `server/routes.ts`

새로운 API 엔드포인트 `POST /api/perso/:postId/persona/:personaId/join` 추가:

```typescript
app.post("/api/perso/:postId/persona/:personaId/join", authenticateToken, async (req, res) => {
  // 1. 페르소나를 participant로 추가
  // 2. AI 기반 소개 메시지 생성 (generateAutoIntroduction)
  // 3. 소개 메시지를 DB에 저장 (messageType: 'join')
  // 4. WebSocket으로 입장 이벤트 브로드캐스트
});
```

**주요 기능:**
- ✅ 페르소나를 `conversationParticipants` 테이블에 추가 (role: 'member')
- ✅ 현재 대화 토픽 분석 (최근 10개 메시지 기반)
- ✅ `generateAutoIntroduction()` 함수를 통한 AI 소개 메시지 생성
- ✅ 소개 메시지를 `messages` 테이블에 저장 (senderType: 'system', messageType: 'join')
- ✅ WebSocket을 통해 두 가지 이벤트 발송:
  - `message:system` - 소개 메시지 데이터
  - `persona:event` - 페르소나 입장 이벤트 (type: 'join')

### 2. 클라이언트 페르소나 클릭 핸들러 수정

**파일:** `client/src/pages/perso.tsx`

`ActivePersonas` 컴포넌트의 `onPersonaClick` prop을 수정하여 서버 API 호출:

```typescript
onPersonaClick={async (personaId) => {
  // 1. 이미 활성화된 페르소나는 무시
  if (existingPersona && existingPersona.status === 'active') {
    return;
  }
  
  // 2. 서버 API 호출
  const response = await fetch(`/api/perso/${postId}/persona/${personaId}/join`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  // 3. 로컬 상태 즉시 업데이트 (WebSocket 이벤트도 올 것임)
  setActivePersonas(prev => [...]);
}}
```

**주요 기능:**
- ✅ 중복 입장 방지 (이미 active 상태인 페르소나는 무시)
- ✅ JWT 토큰 기반 인증
- ✅ 즉각적인 UI 업데이트 (낙관적 업데이트)
- ✅ WebSocket 이벤트와의 동기화

### 3. AI 소개 메시지 생성

**기존 함수 활용:** `server/engine/joinLeaveManager.ts`의 `generateAutoIntroduction()`

```typescript
export async function generateAutoIntroduction(
  personaId: string,
  currentTopics: string[]
): Promise<string> {
  // 1. 페르소나 정보 조회
  // 2. 현재 대화 토픽 기반 프롬프트 생성
  // 3. OpenAI API 호출 (gpt-4o-mini)
  // 4. 자연스러운 한국어 소개 메시지 반환
}
```

**특징:**
- ✅ 페르소나의 특성 반영
- ✅ 현재 대화 주제에 맞는 소개
- ✅ 1문장의 간결한 소개 메시지
- ✅ 실패 시 기본 메시지로 폴백

## 📊 데이터 흐름

```
사용자가 페르소나 클릭
    ↓
클라이언트: API 요청 (/api/perso/:postId/persona/:personaId/join)
    ↓
서버: 페르소나를 participant로 추가
    ↓
서버: AI 소개 메시지 생성 (generateAutoIntroduction)
    ↓
서버: 메시지를 DB에 저장 (messages 테이블)
    ↓
서버: WebSocket 이벤트 발송
    ├─ message:system (소개 메시지)
    └─ persona:event (입장 이벤트)
    ↓
클라이언트: 메시지 수신 및 UI 업데이트
    ├─ handleSystemMessage() - 메시지 추가
    └─ handlePersonaEvent() - 페르소나 상태 업데이트
```

## 🔧 기술적 세부사항

### 메시지 저장 구조

```typescript
{
  conversationId: string,
  senderType: 'system',
  senderId: personaId,  // 입장한 페르소나 ID
  content: `🤖 ${persona.name}: ${introMessage}`,
  messageType: 'join',  // 입장 메시지 타입
}
```

### WebSocket 이벤트 구조

**1. message:system 이벤트:**
```typescript
{
  id: messageId,
  conversationId: string,
  senderType: 'system',
  senderId: personaId,
  messageType: 'join',
  content: string,
  createdAt: ISO timestamp,
  persona: {
    id: string,
    name: string,
    image: string
  }
}
```

**2. persona:event 이벤트:**
```typescript
{
  type: 'join',
  personaId: string,
  personaName: string,
  timestamp: number,
  autoIntroduction: string
}
```

## 🎨 UI/UX 개선사항

1. **즉각적인 피드백**
   - 클릭 즉시 페르소나 상태가 `joining`으로 변경
   - 1초 후 `active` 상태로 전환

2. **중복 방지**
   - 이미 활성화된 페르소나는 클릭 무시
   - 서버에서도 중복 participant 추가 방지 (unique constraint)

3. **에러 핸들링**
   - AI 소개 메시지 생성 실패 시 기본 메시지 사용
   - API 호출 실패 시 콘솔 로그 출력

## 🧪 테스트 방법

1. **기본 입장 테스트**
   ```
   1. 게시물의 대화방 입장
   2. 비활성 페르소나 클릭
   3. 소개 메시지가 표시되는지 확인
   4. 페르소나 상태가 'active'로 변경되는지 확인
   ```

2. **중복 방지 테스트**
   ```
   1. 이미 활성화된 페르소나 클릭
   2. 아무 변화가 없는지 확인
   3. 콘솔에 "already active" 로그 확인
   ```

3. **AI 소개 메시지 테스트**
   ```
   1. 다양한 토픽의 대화방에서 페르소나 입장
   2. 토픽에 맞는 소개 메시지가 생성되는지 확인
   3. 메시지가 DB에 저장되는지 확인
   ```

4. **WebSocket 동기화 테스트**
   ```
   1. 두 개의 브라우저 탭에서 같은 대화방 접속
   2. 한 탭에서 페르소나 입장
   3. 다른 탭에서도 입장 메시지가 표시되는지 확인
   ```

## 📝 관련 파일

### 서버
- `server/routes.ts` - API 엔드포인트
- `server/engine/joinLeaveManager.ts` - AI 소개 메시지 생성
- `server/storage.ts` - participant 추가 로직

### 클라이언트
- `client/src/pages/perso.tsx` - 페르소나 클릭 핸들러
- `client/src/components/ActivePersonas.tsx` - 페르소나 UI
- `client/src/hooks/useWebSocket.ts` - WebSocket 이벤트 핸들링

## 🎉 구현 완료 사항

✅ 서버 API 엔드포인트 추가  
✅ 페르소나 participant 등록  
✅ AI 소개 메시지 생성 및 저장  
✅ WebSocket 이벤트 브로드캐스트  
✅ 클라이언트 페르소나 클릭 핸들러 수정  
✅ 중복 입장 방지  
✅ 에러 핸들링  

## 🚀 다음 단계 (선택사항)

1. **UI 개선**
   - 입장 중 로딩 애니메이션 추가
   - 소개 메시지 특별 스타일링 (예: 하이라이트, 애니메이션)

2. **기능 확장**
   - 페르소나 퇴장 버튼 추가
   - 페르소나별 입장 제한 (예: 최대 5명)
   - 입장 실패 시 사용자 알림 (토스트 메시지)

3. **성능 최적화**
   - AI 소개 메시지 캐싱
   - 토픽 분석 알고리즘 개선

---

**구현 날짜:** 2025-10-08  
**구현자:** AI Assistant  
**버전:** 1.0.0


