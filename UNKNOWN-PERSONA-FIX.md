# Unknown 페르소나 문제 해결 가이드

## 🔍 현재 상황

사용자가 페르소나를 클릭했을 때 여전히 "Unknown"으로 표시되는 문제

## ✅ 수정 완료된 사항

1. **서버 코드 수정 완료** (08:29)
   - `persona.id` (UUID)를 사용하도록 수정
   - `/home/runner/workspace/server/routes.ts` 라인 1240, 1274, 1285, 1314

2. **서버 재시작 완료** (08:29)
   - 프로세스 ID: 1294
   - 정상 작동 중

## 🎯 해결 방법

### 1단계: 브라우저 하드 리프레시

**방법 A: 키보드 단축키**
- Windows/Linux: `Ctrl + Shift + R` 또는 `Ctrl + F5`
- Mac: `Cmd + Shift + R`

**방법 B: 개발자 도구 사용**
1. 개발자 도구 열기 (F12)
2. 네트워크 탭 열기
3. "Disable cache" 체크
4. 새로고침 버튼 우클릭 → "Empty Cache and Hard Reload"

### 2단계: 콘솔 로그 확인

브라우저 개발자 도구 콘솔에서 확인할 내용:

```javascript
// 이런 로그들이 보여야 합니다:
[DEBUG] participants 데이터: [...]
[DEBUG] 변환된 페르소나: {
  id: "807ed04e-c5c4-486...",  // ✅ UUID
  name: "Luna",                // ✅ 이름이 있어야 함!
  owner: {...},
  status: "active"
}
```

### 3단계: 문제 진단

#### Case 1: `personaName: undefined` (서버 문제)

콘솔에 이렇게 보인다면:
```javascript
participants: [{
  personaId: "807ed04e...",
  personaName: undefined,  // ❌ 문제!
  ...
}]
```

**해결:**
```bash
# 서버 재시작
cd /home/runner/workspace
npm run dev
```

#### Case 2: `personaName: "Luna"` 있는데 UI에 Unknown (클라이언트 문제)

콘솔에 이렇게 보인다면:
```javascript
participants: [{
  personaId: "807ed04e...",
  personaName: "Luna",  // ✅ 정상
  ...
}]
```

하지만 UI에 "Unknown" 표시 → 클라이언트 캐시 문제

**해결:**
1. 브라우저 캐시 완전 삭제
2. `localStorage.clear()` 실행
3. 페이지 새로고침

#### Case 3: 데이터베이스에 잘못된 데이터

이전 버그로 인해 DB에 이름("Luna")이 저장된 경우:

```sql
-- 확인
SELECT * FROM conversation_participants 
WHERE participant_type = 'persona' 
AND participant_id NOT LIKE '%-%-%-%-%';

-- 발견되면 삭제 필요
DELETE FROM conversation_participants 
WHERE participant_type = 'persona' 
AND participant_id NOT LIKE '%-%-%-%-%';
```

### 4단계: 테스트

1. **새 페르소나 클릭**
   - 아직 입장하지 않은 다른 페르소나 클릭
   - 예: Kai, Milo, Namu 등

2. **서버 로그 확인**
   ```bash
   tail -f /tmp/server.log | grep "PERSONA JOIN"
   ```

   이런 로그가 보여야 합니다:
   ```
   [PERSONA JOIN API] Received request - postId: xxx, personaId: Luna
   [PERSONA JOIN API] Persona not found by ID, trying by name: Luna
   [PERSONA JOIN API] Found persona: Luna (807ed04e-c5c4-486...)
   [PERSONA JOIN] Luna (807ed04e...) added as participant
   ```

3. **네트워크 탭 확인**
   - `POST /api/perso/:postId/persona/:personaId/join` 요청
   - Response 확인:
   ```json
   {
     "success": true,
     "persona": {
       "id": "807ed04e...",
       "name": "Luna",
       "image": "..."
     },
     "introduction": "..."
   }
   ```

## 🐛 여전히 Unknown이 표시되는 경우

### 디버깅 체크리스트

- [ ] 브라우저 하드 리프레시 완료
- [ ] 서버 로그에서 `[PERSONA JOIN API] Found persona: Luna` 확인
- [ ] 개발자 도구 콘솔에서 `personaName: "Luna"` 확인
- [ ] 네트워크 탭에서 API 응답 `persona.name: "Luna"` 확인
- [ ] `localStorage.clear()` 실행 후 재시도

### 추가 확인 사항

**브라우저 콘솔에서 직접 확인:**

```javascript
// 1. participants 데이터 확인
console.log('Participants:', data?.participants);

// 2. activePersonas 상태 확인
// React DevTools에서 확인하거나

// 3. 강제 재조회
window.location.reload(true);
```

## 📞 여전히 문제가 있다면

다음 정보를 제공해주세요:

1. **브라우저 콘솔 전체 로그** (스크린샷)
2. **네트워크 탭의 API 응답** (스크린샷)
3. **서버 로그** (`/tmp/server.log`의 마지막 100줄)

```bash
# 서버 로그 확인
tail -100 /tmp/server.log
```

---

**작성일:** 2025-10-08  
**상태:** 서버 수정 완료, 클라이언트 캐시 갱신 필요  
**우선순위:** 🔴 High

