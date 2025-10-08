# 🧹 게시물 정리 가이드

## 개요
대화방(페르소)이 없는 게시물들을 조회하고 삭제하는 기능입니다.

## 사용 방법

### 1. 명령줄(CLI)에서 실행

#### 대화방 없는 게시물 목록 조회
```bash
npm run cleanup:posts:list
```

이 명령어는 삭제 없이 대화방이 없는 게시물 목록만 보여줍니다.

**출력 예시:**
```
📊 통계:
   전체 게시물: 18개
   대화방이 있는 게시물: 10개
   대화방이 없는 게시물: 8개

📋 대화방이 없는 게시물 목록:
   1. 오늘의 카페 (ID: xxx)
      작성자 ID: temp-user-id
      생성일: Tue Oct 07 2025
   ...
```

#### 대화방 없는 게시물 삭제
```bash
npm run cleanup:posts:delete
```

또는

```bash
npm run cleanup:posts
```

**출력 예시:**
```
🧹 대화방이 없는 게시물 정리 시작...
📊 전체 게시물 수: 18개
✅ 대화방이 있는 게시물: 10개
🗑️  대화방이 없는 게시물: 8개

📋 삭제될 게시물 목록:
   1. 오늘의 카페 (ID: xxx)
   2. 주말 등산 (ID: xxx)
   ...

✅ 8개의 게시물이 삭제되었습니다.

📊 정리 후 통계:
   전체 게시물: 18개 → 10개
   삭제된 게시물: 8개
   남은 게시물: 10개
```

### 2. API 엔드포인트로 실행

#### 대화방 없는 게시물 목록 조회 (미리보기)
```http
GET /api/admin/posts/cleanup/preview
```

**응답 예시:**
```json
{
  "success": true,
  "totalPosts": 18,
  "postsWithConversations": 10,
  "postsWithoutConversations": 8,
  "posts": [
    {
      "id": "28d4467f-931c-4417-ab42-9a5f0c6cc0a1",
      "title": "오늘의 카페",
      "userId": "temp-user-id",
      "createdAt": "2025-10-07T19:21:20.904Z"
    }
  ]
}
```

#### 대화방 없는 게시물 삭제
```http
POST /api/admin/posts/cleanup
```

**응답 예시:**
```json
{
  "success": true,
  "deletedCount": 8,
  "deletedPosts": [
    {
      "id": "28d4467f-931c-4417-ab42-9a5f0c6cc0a1",
      "title": "오늘의 카페"
    }
  ],
  "message": "8개의 게시물이 삭제되었습니다."
}
```

### 3. JavaScript/TypeScript에서 사용

```typescript
import { 
  cleanupPostsWithoutConversations, 
  listPostsWithoutConversations 
} from './server/scripts/cleanup-posts.js';

// 목록만 조회
const previewResult = await listPostsWithoutConversations();
console.log(`삭제 대상: ${previewResult.postsWithoutConversations}개`);

// 삭제 실행
const cleanupResult = await cleanupPostsWithoutConversations();
console.log(`삭제 완료: ${cleanupResult.deletedCount}개`);
```

## 작동 원리

### 대화방이 없는 게시물이란?
- `posts` 테이블에는 존재하지만
- `post_conversations` 테이블에 연결된 `conversation`이 없는 게시물

### 삭제 로직
1. 모든 게시물 조회
2. `post_conversations`와 `conversations` 테이블을 조인하여 대화방이 있는 게시물 ID 조회
3. 대화방이 없는 게시물 필터링
4. 필터링된 게시물 삭제 (CASCADE로 관련 데이터도 함께 삭제)

### 안전성
- **미리보기 기능**: 삭제 전에 목록을 확인할 수 있습니다
- **트랜잭션**: 데이터베이스 트랜잭션으로 안전하게 삭제
- **CASCADE 삭제**: 관련된 좋아요, 댓글 등도 자동으로 삭제
- **로깅**: 모든 작업이 로그에 기록됨

## 실행 결과 확인

### CLI 로그
- **INFO**: 일반 정보 (청록색)
- **WARN**: 경고 (노란색)
- **ERROR**: 에러 (빨간색)

### 반환 객체
```typescript
interface CleanupResult {
  success: boolean;
  deletedCount?: number;
  deletedPosts?: Array<{ id: string; title: string }>;
  message?: string;
  error?: string;
}

interface ListResult {
  success: boolean;
  totalPosts?: number;
  postsWithConversations?: number;
  postsWithoutConversations?: number;
  posts?: Array<{
    id: string;
    title: string;
    userId: string;
    createdAt: Date;
  }>;
  error?: string;
}
```

## 주의사항

⚠️ **경고**
- 이 작업은 **되돌릴 수 없습니다**
- 프로덕션 환경에서는 **반드시 백업** 후 실행하세요
- **미리보기**를 먼저 실행하여 삭제될 게시물을 확인하세요

## 자동화

### 정기적인 정리 (Cron Job)
```bash
# 매일 자정에 실행
0 0 * * * cd /path/to/project && npm run cleanup:posts:delete
```

### Node.js 스케줄러
```typescript
import cron from 'node-cron';
import { cleanupPostsWithoutConversations } from './server/scripts/cleanup-posts.js';

// 매일 자정에 실행
cron.schedule('0 0 * * *', async () => {
  console.log('정리 작업 시작...');
  const result = await cleanupPostsWithoutConversations();
  console.log(`정리 완료: ${result.deletedCount}개 삭제`);
});
```

## 트러블슈팅

### "Permission denied" 에러
```bash
# 실행 권한 추가
chmod +x server/scripts/cleanup-posts.ts
```

### 데이터베이스 연결 실패
- `.env` 파일에 `DATABASE_URL`이 올바르게 설정되어 있는지 확인
- 데이터베이스 서버가 실행 중인지 확인

### 삭제가 되지 않음
- 외래 키 제약 조건 확인
- 데이터베이스 로그 확인

## 관련 파일

- `server/scripts/cleanup-posts.ts` - 메인 스크립트
- `server/routes.ts` - API 엔드포인트
- `package.json` - npm 스크립트 정의
- `shared/schema.ts` - 데이터베이스 스키마

## 도움말

더 많은 정보가 필요하시면:
- GitHub Issues에 문의
- 개발 팀에 연락
- 문서를 참고하세요
