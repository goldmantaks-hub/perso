-- ============================================================================
-- PERSO 메시징 시스템 리팩터링 마이그레이션
-- ============================================================================
-- 목적: 단순한 perso_messages에서 확장 가능한 대화 시스템으로 전환
-- - DM, 그룹 대화, 멀티미디어 메시지 지원
-- - 읽음 표시, 모더레이션, AI 메타데이터
-- - 다형성 발신자 (user/persona)
-- ============================================================================

-- 1. 새로운 테이블 생성
-- ============================================================================

-- 1.1 conversations: 대화 스레드 (post, dm, room)
CREATE TABLE IF NOT EXISTS conversations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type VARCHAR(20) NOT NULL,  -- 'post' | 'dm' | 'room'
  scope_id VARCHAR,                  -- 연결된 리소스 ID (post_id 등)
  title TEXT,                        -- 대화방 제목 (옵션)
  created_by_type VARCHAR(20) NOT NULL,  -- 'user' | 'persona'
  created_by_id VARCHAR NOT NULL,    -- 생성자 ID
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 인덱스: scope 기반 조회 최적화
CREATE INDEX IF NOT EXISTS conversations_scope_idx ON conversations(scope_type, scope_id);

-- 1.2 conversation_participants: 참가자 관리
CREATE TABLE IF NOT EXISTS conversation_participants (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id VARCHAR NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  participant_type VARCHAR(20) NOT NULL,  -- 'user' | 'persona'
  participant_id VARCHAR NOT NULL,        -- 참가자 ID
  role VARCHAR(20) NOT NULL DEFAULT 'member',  -- 'owner' | 'member' | 'moderator'
  joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_read_message_id VARCHAR            -- 읽음 표시용
);

-- 복합 unique: 같은 대화에 같은 참가자가 중복으로 들어갈 수 없음
CREATE UNIQUE INDEX IF NOT EXISTS conversation_participants_unique_idx 
  ON conversation_participants(conversation_id, participant_type, participant_id);

-- 1.3 messages: 통합 메시지 테이블
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id VARCHAR NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type VARCHAR(20) NOT NULL,      -- 'user' | 'persona'
  sender_id VARCHAR NOT NULL,            -- 발신자 ID
  content TEXT NOT NULL,
  message_type VARCHAR(20) NOT NULL DEFAULT 'text',  -- 'text' | 'image' | 'audio' | 'system'
  reply_to_id VARCHAR,                   -- 스레드형 답글
  meta JSONB,                            -- { sentiment, tags, attachments, flagged, reason 등 }
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  edited_at TIMESTAMP,                   -- 수정 시각
  deleted_at TIMESTAMP                   -- soft delete
);

-- 인덱스: 대화별 메시지 조회 (시간순)
CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages(conversation_id, created_at);
-- 인덱스: 발신자별 메시지 조회
CREATE INDEX IF NOT EXISTS messages_sender_idx ON messages(sender_type, sender_id);
-- Self-referencing FK: 답글
ALTER TABLE messages ADD CONSTRAINT messages_reply_to_fk 
  FOREIGN KEY (reply_to_id) REFERENCES messages(id) ON DELETE SET NULL;

-- 1.4 post_conversations: post와 conversation 연결 (옵션)
CREATE TABLE IF NOT EXISTS post_conversations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id VARCHAR NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  conversation_id VARCHAR NOT NULL REFERENCES conversations(id) ON DELETE CASCADE
);

-- Unique: 하나의 post는 하나의 conversation만 가질 수 있음
CREATE UNIQUE INDEX IF NOT EXISTS post_conversations_unique_idx 
  ON post_conversations(post_id, conversation_id);

-- ============================================================================
-- 2. 데이터 마이그레이션: perso_messages → messages
-- ============================================================================

-- 2.1 기존 post별로 conversation 생성
INSERT INTO conversations (id, scope_type, scope_id, created_by_type, created_by_id, created_at, updated_at)
SELECT 
  gen_random_uuid() as id,
  'post' as scope_type,
  pm.post_id as scope_id,
  CASE 
    WHEN pm.user_id IS NOT NULL THEN 'user'
    ELSE 'persona'
  END as created_by_type,
  COALESCE(pm.user_id, pm.persona_id) as created_by_id,
  MIN(pm.created_at) as created_at,
  MAX(pm.created_at) as updated_at
FROM perso_messages pm
GROUP BY pm.post_id, COALESCE(pm.user_id, pm.persona_id)
ON CONFLICT DO NOTHING;

-- 2.2 post_conversations 연결 테이블 채우기
INSERT INTO post_conversations (post_id, conversation_id)
SELECT DISTINCT
  c.scope_id as post_id,
  c.id as conversation_id
FROM conversations c
WHERE c.scope_type = 'post'
ON CONFLICT DO NOTHING;

-- 2.3 기존 메시지를 새 messages 테이블로 복사
INSERT INTO messages (
  id,
  conversation_id,
  sender_type,
  sender_id,
  content,
  message_type,
  meta,
  created_at
)
SELECT 
  pm.id,
  c.id as conversation_id,
  CASE 
    WHEN pm.is_ai THEN 'persona'
    ELSE 'user'
  END as sender_type,
  COALESCE(pm.persona_id, pm.user_id) as sender_id,
  pm.content,
  'text' as message_type,
  NULL as meta,
  pm.created_at
FROM perso_messages pm
JOIN conversations c ON c.scope_type = 'post' AND c.scope_id = pm.post_id
ON CONFLICT DO NOTHING;

-- 2.4 참가자 자동 생성 (메시지 발신자 기준)
INSERT INTO conversation_participants (
  conversation_id,
  participant_type,
  participant_id,
  role,
  joined_at
)
SELECT DISTINCT
  m.conversation_id,
  m.sender_type,
  m.sender_id,
  'member' as role,
  MIN(m.created_at) as joined_at
FROM messages m
GROUP BY m.conversation_id, m.sender_type, m.sender_id
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 3. 향후 확장 고려사항
-- ============================================================================

-- 3.1 message_embeddings 테이블 (검색/추천용)
-- CREATE TABLE IF NOT EXISTS message_embeddings (
--   id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
--   message_id VARCHAR NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
--   embedding VECTOR(1536),  -- OpenAI ada-002 차원
--   model VARCHAR(50) NOT NULL,
--   created_at TIMESTAMP NOT NULL DEFAULT NOW()
-- );
-- CREATE INDEX ON message_embeddings USING ivfflat (embedding vector_cosine_ops);

-- 3.2 moderation_logs 테이블 (메시지 검토 기록)
-- CREATE TABLE IF NOT EXISTS moderation_logs (
--   id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
--   message_id VARCHAR NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
--   action VARCHAR(20) NOT NULL,  -- 'flag' | 'hide' | 'delete'
--   reason TEXT,
--   moderator_type VARCHAR(20),   -- 'user' | 'ai'
--   moderator_id VARCHAR,
--   created_at TIMESTAMP NOT NULL DEFAULT NOW()
-- );

-- ============================================================================
-- 4. 정리 (선택)
-- ============================================================================

-- 마이그레이션 확인 후 기존 테이블 제거
-- DROP TABLE IF EXISTS perso_messages;

COMMENT ON TABLE conversations IS '대화 스레드 (post/dm/room 타입별)';
COMMENT ON TABLE conversation_participants IS '대화 참가자 (읽음 표시, 역할 관리)';
COMMENT ON TABLE messages IS '통합 메시지 (다형성 발신자, 멀티미디어, soft delete)';
COMMENT ON TABLE post_conversations IS 'post와 conversation 연결 테이블';
