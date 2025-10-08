// 애플리케이션 전역 상수 정의
export const APP_CONSTANTS = {
  // 시간 관련 상수 (밀리초)
  TIME: {
    COOLDOWN_PERIOD: 2 * 60 * 1000, // 2분 쿨다운
    DUPLICATE_CHECK_PERIOD: 10 * 60 * 1000, // 10분 중복 체크
    ROOM_CLEANUP_PERIOD: 10 * 60 * 1000, // 10분 룸 정리
    AUTO_TICK_INTERVAL: 30 * 1000, // 30초 자동 틱
    SESSION_TIMEOUT: 30 * 60 * 1000, // 30분 세션 타임아웃
  },

  // 감정 분석 임계값
  SENTIMENT: {
    MIN_POSITIVE_THRESHOLD: 0.8, // 최소 긍정 감성 임계값
    MIN_SIMILARITY_THRESHOLD: 0.75, // 최소 유사도 임계값
    HIGH_RESONANCE_THRESHOLD: 0.9, // 높은 공명 임계값
    JACKPOT_CHANCE: 0.02, // 잭팟 확률 (2%)
  },

  // 포인트 시스템
  POINTS: {
    POST_CREATED: 10,
    DIALOGUE_PARTICIPATED: 5,
    EMPATHY_SHOWN: 15,
    GROWTH_ACHIEVED: 20,
    PERSO_OPENED: 10,
    PERSO_OPENED_HIGH_RESONANCE: 20,
  },

  // 성장 배수
  GROWTH: {
    JACKPOT_MULTIPLIER: 2,
    DEFAULT_MULTIPLIER: 1,
  },

  // 페르소나 관련
  PERSONA: {
    MAX_ACTIVE_PERSONAS: 5,
    MIN_ACTIVE_PERSONAS: 1,
    MAX_MESSAGE_LENGTH: 500,
    MIN_MESSAGE_LENGTH: 10,
  },

  // 룸 관리
  ROOM: {
    MAX_ROOMS: 100,
    MAX_TURNS_PER_ROOM: 50,
    HANDOVER_THRESHOLD: 3, // 3턴마다 주도권 교체 체크
  },

  // API 관련
  API: {
    MAX_RETRIES: 3,
    TIMEOUT: 30000, // 30초
    RATE_LIMIT: 100, // 분당 100회
  },

  // UI 관련
  UI: {
    ANIMATION_DURATION: 300, // 300ms
    TOOLTIP_DELAY: 500, // 500ms
    DEBOUNCE_DELAY: 300, // 300ms
  },
} as const;

// 페르소나 색상 테마
export const PERSONA_COLORS = {
  Kai: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    accent: 'bg-blue-500',
    hover: 'hover:bg-blue-100',
  },
  Espri: {
    bg: 'bg-pink-50',
    text: 'text-pink-700',
    border: 'border-pink-200',
    accent: 'bg-pink-500',
    hover: 'hover:bg-pink-100',
  },
  Luna: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    accent: 'bg-purple-500',
    hover: 'hover:bg-purple-100',
  },
  Namu: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    accent: 'bg-green-500',
    hover: 'hover:bg-green-100',
  },
  Milo: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    accent: 'bg-orange-500',
    hover: 'hover:bg-orange-100',
  },
  Eden: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    accent: 'bg-indigo-500',
    hover: 'hover:bg-indigo-100',
  },
  Ava: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    accent: 'bg-rose-500',
    hover: 'hover:bg-rose-100',
  },
  Rho: {
    bg: 'bg-cyan-50',
    text: 'text-cyan-700',
    border: 'border-cyan-200',
    accent: 'bg-cyan-500',
    hover: 'hover:bg-cyan-100',
  },
  Noir: {
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    border: 'border-gray-200',
    accent: 'bg-gray-500',
    hover: 'hover:bg-gray-100',
  },
} as const;

// 애니메이션 타입
export const ANIMATION_TYPES = {
  ENTER: 'enter',
  EXIT: 'exit',
  HOVER: 'hover',
  TAP: 'tap',
  PULSE: 'pulse',
  MESSAGE: 'message',
} as const;

// 툴팁 타입
export const TOOLTIP_TYPES = {
  THINKING: 'thinking',
  EXPANDED_INFO: 'expanded_info',
  PERSONA_INFO: 'persona_info',
  STATUS: 'status',
} as const;

// 페르소나 상태
export const PERSONA_STATUS = {
  ACTIVE: 'active',
  WAITING: 'waiting',
  JOINING: 'joining',
  LEAVING: 'leaving',
} as const;

// 메시지 타입
export const MESSAGE_TYPES = {
  EMPATH: 'empath',
  HUMOR: 'humor',
  KNOWLEDGE: 'knowledge',
  CREATIVE: 'creative',
  ANALYTICAL: 'analytical',
} as const;

// 이벤트 타입
export const EVENT_TYPES = {
  JOIN: 'join',
  LEAVE: 'leave',
  HANDOVER: 'handover',
  MESSAGE: 'message',
  SYSTEM: 'system',
} as const;

// 에러 메시지
export const ERROR_MESSAGES = {
  INSUFFICIENT_POSITIVE_SENTIMENT: '긍정 감성이 부족합니다 (≥0.8 필요)',
  INSUFFICIENT_SIMILARITY: '유사도가 부족합니다 (≥0.75 필요)',
  COOLDOWN_ACTIVE: '2분 쿨다운 중입니다',
  DUPLICATE_CONTENT: '중복된 내용입니다',
  ROOM_NOT_FOUND: '룸을 찾을 수 없습니다',
  PERSONA_NOT_FOUND: '페르소나를 찾을 수 없습니다',
  INVALID_INPUT: '잘못된 입력입니다',
  RATE_LIMIT_EXCEEDED: '요청 한도를 초과했습니다',
} as const;

// 성공 메시지
export const SUCCESS_MESSAGES = {
  PERSO_OPENED: '페르소나가 성공적으로 열렸습니다',
  ROOM_CREATED: '룸이 성공적으로 생성되었습니다',
  MESSAGE_SENT: '메시지가 성공적으로 전송되었습니다',
  PERSONA_JOINED: '페르소나가 대화에 참여했습니다',
  PERSONA_LEFT: '페르소나가 대화를 떠났습니다',
} as const;

// 로그 레벨
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
} as const;

// 환경 변수 기본값
export const ENV_DEFAULTS = {
  PORT: 5000,
  NODE_ENV: 'development',
  LOG_LEVEL: 'info',
} as const;
