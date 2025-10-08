import { PERSONA_STATUS, MESSAGE_TYPES, EVENT_TYPES } from './constants.js';

// 페르소나 상태 타입
export type PersonaStatus = typeof PERSONA_STATUS[keyof typeof PERSONA_STATUS];

// 메시지 타입
export type MessageType = typeof MESSAGE_TYPES[keyof typeof MESSAGE_TYPES];

// 이벤트 타입
export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];

// 페르소나 상태 인터페이스
export interface PersonaState {
  id: string;
  status: PersonaStatus;
  joinedAt: number;
  lastSpokeAt: number;
  messageCount: number;
}

// 메시지 인터페이스
export interface Message {
  id: string;
  persona: string;
  message: string;
  thinking?: string;
  type?: MessageType;
  expandedInfo?: ExpandedInfo;
  timestamp?: number;
  index?: number;
  total?: number;
}

// 확장 정보 인터페이스
export interface ExpandedInfo {
  type: string;
  data: Record<string, any>;
  timestamp: number;
}

// 토픽 가중치 인터페이스
export interface TopicWeight {
  topic: string;
  weight: number;
}

// 감정 분석 결과 인터페이스
export interface SentimentAnalysis {
  positive: number;
  neutral: number;
  negative: number;
}

// 주제 분석 결과 인터페이스
export interface SubjectAnalysis {
  topic: string;
  weight: number;
  confidence: number;
}

// 콘텐츠 분석 결과 인터페이스
export interface ContentAnalysis {
  sentiment: SentimentAnalysis;
  subjects: SubjectAnalysis[];
  tones: string[];
  contexts: string[];
  confidence: number;
}

// 페르소나 열기 입력 인터페이스
export interface OpenPersoInput {
  userId: string;
  username: string;
  postId: string;
  content: string;
  sentiment: SentimentAnalysis;
  deltas?: Record<string, number>;
  personaName?: string;
}

// 페르소나 열기 결과 인터페이스
export interface OpenPersoResult {
  success: boolean;
  reason?: string;
  points?: number;
  jackpot?: boolean;
  growthMultiplier?: number;
}

// 룸 인터페이스
export interface Room {
  roomId: string;
  postId: string;
  activePersonas: PersonaState[];
  dominantPersona: string | null;
  currentTopics: TopicWeight[];
  previousTopics: TopicWeight[];
  totalTurns: number;
  turnsSinceDominantChange: number;
  lastActivity: number;
  createdAt: number;
}

// 입장/퇴장 이벤트 인터페이스
export interface JoinLeaveEvent {
  personaId: string;
  eventType: 'join' | 'leave';
  autoIntroduction?: string;
  timestamp: number;
}

// 주도권 교체 결과 인터페이스
export interface HandoverResult {
  shouldHandover: boolean;
  newDominantPersona: string | null;
  reason: string;
}

// 대화 오케스트레이션 결과 인터페이스
export interface DialogueOrchestrationResult {
  roomId: string;
  messages: Message[];
  joinLeaveEvents: JoinLeaveEvent[];
  handoverEvents: HandoverResult[];
  totalTurns: number;
  activePersonas: PersonaState[];
}

// API 응답 인터페이스
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: number;
}

// 페이징 인터페이스
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

// 페이징 결과 인터페이스
export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// 사용자 인터페이스
export interface User {
  id: string;
  username: string;
  email?: string;
  avatar?: string;
  createdAt: number;
  lastActiveAt: number;
  preferences?: UserPreferences;
}

// 사용자 설정 인터페이스
export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
  privacy: {
    showOnlineStatus: boolean;
    allowDirectMessages: boolean;
  };
}

// 게시물 인터페이스
export interface Post {
  id: string;
  userId: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  likes: number;
  comments: number;
  shares: number;
  tags: string[];
  visibility: 'public' | 'private' | 'friends';
}

// 댓글 인터페이스
export interface Comment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  likes: number;
  parentId?: string;
  replies: Comment[];
}

// 알림 인터페이스
export interface Notification {
  id: string;
  userId: string;
  type: 'like' | 'comment' | 'share' | 'mention' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: number;
  data?: Record<string, any>;
}

// 통계 인터페이스
export interface Statistics {
  totalUsers: number;
  totalPosts: number;
  totalComments: number;
  totalLikes: number;
  activeUsers: number;
  newUsersToday: number;
  postsToday: number;
  commentsToday: number;
}

// 웹소켓 메시지 인터페이스
export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
  roomId?: string;
  userId?: string;
}

// 웹소켓 이벤트 인터페이스
export interface WebSocketEvent {
  event: string;
  data: any;
  timestamp: number;
}

// 캐시 인터페이스
export interface CacheItem<T> {
  key: string;
  value: T;
  expiresAt: number;
  createdAt: number;
}

// 설정 인터페이스
export interface AppConfig {
  port: number;
  nodeEnv: string;
  logLevel: string;
  databaseUrl: string;
  sessionSecret: string;
  corsOrigin: string;
  rateLimitWindow: number;
  rateLimitMax: number;
}

// 미들웨어 타입
export type Middleware = (req: any, res: any, next: any) => void;

// 라우트 핸들러 타입
export type RouteHandler = (req: any, res: any) => Promise<void> | void;

// 에러 핸들러 타입
export type ErrorHandler = (error: Error, req: any, res: any, next: any) => void;

// 유틸리티 타입들
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type Required<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

// 제네릭 API 응답 타입
export type APIResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
  message?: string;
};

// 이벤트 리스너 타입
export type EventListener<T = any> = (data: T) => void | Promise<void>;

// 이벤트 에미터 인터페이스
export interface EventEmitter {
  on<T>(event: string, listener: EventListener<T>): void;
  off<T>(event: string, listener: EventListener<T>): void;
  emit<T>(event: string, data: T): void;
}

// 데이터베이스 모델 인터페이스
export interface DatabaseModel {
  id: string;
  createdAt: number;
  updatedAt: number;
}

// 검색 결과 인터페이스
export interface SearchResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  query: string;
  filters?: Record<string, any>;
}

// 정렬 옵션 인터페이스
export interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
}

// 필터 옵션 인터페이스
export interface FilterOption {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'like' | 'regex';
  value: any;
}
