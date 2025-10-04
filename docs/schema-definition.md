# PERSO 스키마 정의

## 1. User 엔티티

### 필드 정의
| 필드명 | 타입 | 설명 |
|--------|------|------|
| id | varchar (UUID) | 사용자 고유 ID |
| display_name | text | 표시 이름 (예: "김지은") |
| handle | text (unique) | 사용자 핸들 (예: "@jieun_kim") |
| avatar_url | text | 프로필 아바타 이미지 URL |
| bio | text | 자기소개 |
| followers_count | integer | 팔로워 수 |
| following_count | integer | 팔로잉 수 |
| locale | varchar(10) | 언어 설정 (예: "ko", "en") |
| theme | varchar(10) | 테마 설정 ("light" / "dark") |
| active_tab | varchar(50) | 현재 활성 탭 |
| created_at | timestamp | 생성 시각 |
| updated_at | timestamp | 수정 시각 |

### JSON 예시
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "display_name": "김지은",
  "handle": "jieun_kim",
  "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=jieun",
  "bio": "일상을 기록하는 사진작가 📸",
  "followers_count": 1250,
  "following_count": 480,
  "locale": "ko",
  "theme": "dark",
  "active_tab": "feed",
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-10-04T14:22:00Z"
}
```

---

## 2. Persona 엔티티

### 필드 정의
| 필드명 | 타입 | 설명 |
|--------|------|------|
| id | varchar (UUID) | 페르소나 고유 ID |
| user_id | varchar (UUID) | 소유 사용자 ID (FK) |
| name | text | 페르소나 이름 (예: "지은이의 AI 페르소나") |
| type | varchar(50) | 페르소나 타입 (예: "creative", "analytical") |
| profile_image_url | text | 페르소나 프로필 이미지 URL |
| summary | text | 페르소나 설명 |
| stats | jsonb | 스탯 정보 (empathy, creativity, knowledge, humor, sociability) |
| points_available | integer | 사용 가능한 포인트 |
| allocation_pending | jsonb | 스탯 강화 대기 중인 값 |
| last_applied_at | timestamp | 마지막 스탯 적용 시각 |
| growth_history | jsonb | 포인트 사용 이력 배열 |

### Stats 구조 (JSONB)
```typescript
{
  "empathy": {
    "level": number,      // 현재 레벨
    "progress": number    // 0~1 사이 값 (다음 레벨까지 진행률)
  },
  "creativity": {
    "level": number,
    "progress": number
  },
  "knowledge": {
    "level": number,
    "progress": number
  },
  "humor": {
    "level": number,
    "progress": number
  },
  "sociability": {
    "level": number,
    "progress": number
  }
}
```

### Allocation Pending 구조 (JSONB)
```typescript
{
  "empathy": number,      // 할당 예정 포인트
  "creativity": number,
  "knowledge": number,
  "humor": number,
  "sociability": number
}
```

### Growth History 구조 (JSONB Array)
```typescript
[
  {
    "timestamp": string,        // ISO 8601 datetime
    "stat": string,             // "empathy" | "creativity" | "knowledge" | "humor" | "sociability"
    "points_used": number,      // 사용한 포인트
    "level_before": number,     // 변경 전 레벨
    "level_after": number       // 변경 후 레벨
  }
]
```

### JSON 예시
```json
{
  "id": "660f9500-f39c-52e5-b827-557766550111",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "지은이의 AI 페르소나",
  "type": "creative",
  "profile_image_url": "https://api.dicebear.com/7.x/bottts/svg?seed=jieun_ai",
  "summary": "감성적이고 창의적인 대화를 좋아하는 AI 친구",
  "stats": {
    "empathy": {
      "level": 5,
      "progress": 0.65
    },
    "creativity": {
      "level": 7,
      "progress": 0.32
    },
    "knowledge": {
      "level": 4,
      "progress": 0.88
    },
    "humor": {
      "level": 6,
      "progress": 0.12
    },
    "sociability": {
      "level": 5,
      "progress": 0.45
    }
  },
  "points_available": 12,
  "allocation_pending": {
    "empathy": 3,
    "creativity": 0,
    "knowledge": 2,
    "humor": 0,
    "sociability": 0
  },
  "last_applied_at": "2025-10-01T09:15:00Z",
  "growth_history": [
    {
      "timestamp": "2025-10-01T09:15:00Z",
      "stat": "creativity",
      "points_used": 5,
      "level_before": 6,
      "level_after": 7
    },
    {
      "timestamp": "2025-09-28T14:30:00Z",
      "stat": "empathy",
      "points_used": 4,
      "level_before": 4,
      "level_after": 5
    }
  ]
}
```

---

## 3. 규칙 정의

### Progress 규칙
- **범위**: 0 ~ 1 사이의 실수
- **의미**: 다음 레벨까지의 진행률 (0% ~ 100%)
- **예시**: 
  - `0.0` = 레벨 업 직후 (0%)
  - `0.5` = 절반 진행 (50%)
  - `0.99` = 레벨 업 직전 (99%)

### Allocation Pending 규칙
- **제약**: `allocation_pending` 합계는 `points_available` 이하여야 함
- **검증 로직**:
  ```typescript
  const totalPending = Object.values(allocation_pending).reduce((sum, val) => sum + val, 0);
  if (totalPending > points_available) {
    throw new Error("할당 포인트가 사용 가능 포인트를 초과합니다");
  }
  ```

### Apply (스탯 적용) 규칙
1. **stats 업데이트**: `allocation_pending` 값을 `stats`에 적용
2. **points 차감**: `points_available -= totalPending`
3. **growth_history 기록**: 변경 이력을 배열에 추가
4. **allocation_pending 초기화**: 모든 값을 0으로 리셋
5. **last_applied_at 업데이트**: 현재 시각으로 설정

---

## 4. API 계약 스케치

### 4.1 사용자 정보 조회
```
GET /api/users/:id
```

**Response 200 OK**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "display_name": "김지은",
  "handle": "jieun_kim",
  "avatar_url": "https://...",
  "bio": "일상을 기록하는 사진작가 📸",
  "followers_count": 1250,
  "following_count": 480,
  "locale": "ko",
  "theme": "dark",
  "active_tab": "feed",
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-10-04T14:22:00Z"
}
```

### 4.2 활성 페르소나 조회
```
GET /api/personas/:userId/active
```

**Response 200 OK**
```json
{
  "id": "660f9500-f39c-52e5-b827-557766550111",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "지은이의 AI 페르소나",
  "type": "creative",
  "profile_image_url": "https://...",
  "summary": "감성적이고 창의적인 대화를 좋아하는 AI 친구",
  "stats": {
    "empathy": { "level": 5, "progress": 0.65 },
    "creativity": { "level": 7, "progress": 0.32 },
    "knowledge": { "level": 4, "progress": 0.88 },
    "humor": { "level": 6, "progress": 0.12 },
    "sociability": { "level": 5, "progress": 0.45 }
  },
  "points_available": 12,
  "allocation_pending": {
    "empathy": 3,
    "creativity": 0,
    "knowledge": 2,
    "humor": 0,
    "sociability": 0
  },
  "last_applied_at": "2025-10-01T09:15:00Z",
  "growth_history": [...]
}
```

### 4.3 포인트 분배 요청
```
POST /api/personas/:id/allocate
```

**Request Body**
```json
{
  "empathy": 3,
  "creativity": 0,
  "knowledge": 2,
  "humor": 0,
  "sociability": 0
}
```

**Response 200 OK**
```json
{
  "success": true,
  "persona": {
    "id": "660f9500-f39c-52e5-b827-557766550111",
    "stats": {
      "empathy": { "level": 6, "progress": 0.15 },
      "creativity": { "level": 7, "progress": 0.32 },
      "knowledge": { "level": 5, "progress": 0.22 },
      "humor": { "level": 6, "progress": 0.12 },
      "sociability": { "level": 5, "progress": 0.45 }
    },
    "points_available": 7,
    "allocation_pending": {
      "empathy": 0,
      "creativity": 0,
      "knowledge": 0,
      "humor": 0,
      "sociability": 0
    },
    "last_applied_at": "2025-10-04T15:30:00Z"
  }
}
```

**Error 400 Bad Request**
```json
{
  "error": "할당 포인트가 사용 가능 포인트를 초과합니다",
  "points_available": 12,
  "total_pending": 15
}
```

---

## 5. 채팅방 구분 로직

### 현재 구조
- **채팅방 식별**: `postId` 기준
- **AI 페르소나**: 글쓴이의 페르소나가 대화 참여
- **공유 방식**: 같은 게시물에 접속한 모든 사용자가 동일한 채팅방 공유

### 예시
- 사용자 A가 게시물 #123에 "안녕하세요"라고 메시지 작성
- 사용자 B도 게시물 #123에 접속하면 사용자 A의 메시지를 볼 수 있음
- 게시물 작성자의 페르소나가 AI 응답 생성

### 고려사항
**각 사용자마다 독립적인 채팅방이 필요한 경우**:
- `perso_messages` 테이블에 `visitor_user_id` 필드 추가
- 채팅방 식별: `postId + visitor_user_id` 조합
- 각 사용자는 글쓴이의 페르소나와 1:1 대화

---

## 6. 데이터베이스 마이그레이션 계획

### 6.1 Users 테이블 업데이트
```sql
-- 새 컬럼 추가
ALTER TABLE users ADD COLUMN display_name TEXT;
ALTER TABLE users ADD COLUMN handle TEXT UNIQUE;
ALTER TABLE users ADD COLUMN avatar_url TEXT;
ALTER TABLE users ADD COLUMN bio TEXT;
ALTER TABLE users ADD COLUMN followers_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN following_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN locale VARCHAR(10) DEFAULT 'ko';
ALTER TABLE users ADD COLUMN theme VARCHAR(10) DEFAULT 'light';
ALTER TABLE users ADD COLUMN active_tab VARCHAR(50) DEFAULT 'feed';
ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();

-- 기존 데이터 마이그레이션
UPDATE users SET 
  display_name = name,
  handle = username,
  avatar_url = profile_image;
```

### 6.2 Personas 테이블 업데이트
```sql
-- 새 컬럼 추가
ALTER TABLE personas ADD COLUMN type VARCHAR(50) DEFAULT 'balanced';
ALTER TABLE personas ADD COLUMN profile_image_url TEXT;
ALTER TABLE personas ADD COLUMN summary TEXT;
ALTER TABLE personas ADD COLUMN stats JSONB DEFAULT '{}';
ALTER TABLE personas ADD COLUMN points_available INTEGER DEFAULT 0;
ALTER TABLE personas ADD COLUMN allocation_pending JSONB DEFAULT '{}';
ALTER TABLE personas ADD COLUMN last_applied_at TIMESTAMP;
ALTER TABLE personas ADD COLUMN growth_history JSONB DEFAULT '[]';

-- 기존 데이터 마이그레이션
UPDATE personas SET 
  profile_image_url = image,
  summary = description,
  stats = '{"empathy": {"level": 1, "progress": 0}, "creativity": {"level": 1, "progress": 0}, "knowledge": {"level": 1, "progress": 0}, "humor": {"level": 1, "progress": 0}, "sociability": {"level": 1, "progress": 0}}',
  allocation_pending = '{"empathy": 0, "creativity": 0, "knowledge": 0, "humor": 0, "sociability": 0}';
```
