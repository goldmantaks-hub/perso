import { APP_CONSTANTS, ENV_DEFAULTS } from './constants.js';

// 환경 변수 타입 정의
interface EnvironmentConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug';
  OPENAI_API_KEY: string;
  DATABASE_URL: string;
  SESSION_SECRET: string;
  CORS_ORIGIN: string;
  RATE_LIMIT_WINDOW: number;
  RATE_LIMIT_MAX: number;
}

// 환경 변수 검증 함수
function validateEnvironment(): EnvironmentConfig {
  const requiredEnvVars = [
    'OPENAI_API_KEY',
    'DATABASE_URL',
    'SESSION_SECRET'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  return {
    NODE_ENV: (process.env.NODE_ENV as EnvironmentConfig['NODE_ENV']) || ENV_DEFAULTS.NODE_ENV,
    PORT: parseInt(process.env.PORT || ENV_DEFAULTS.PORT.toString(), 10),
    LOG_LEVEL: (process.env.LOG_LEVEL as EnvironmentConfig['LOG_LEVEL']) || ENV_DEFAULTS.LOG_LEVEL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
    DATABASE_URL: process.env.DATABASE_URL!,
    SESSION_SECRET: process.env.SESSION_SECRET!,
    CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
    RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10), // 1분
    RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || APP_CONSTANTS.API.RATE_LIMIT.toString(), 10),
  };
}

// 설정 객체 생성
export const config = validateEnvironment();

// 개발 환경 확인
export const isDevelopment = config.NODE_ENV === 'development';
export const isProduction = config.NODE_ENV === 'production';
export const isTest = config.NODE_ENV === 'test';

// 로깅 설정
export const logConfig = {
  level: config.LOG_LEVEL,
  format: isDevelopment ? 'pretty' : 'json',
  timestamp: true,
  colorize: isDevelopment,
};

// 데이터베이스 설정
export const dbConfig = {
  url: config.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200,
  },
};

// 세션 설정
export const sessionConfig = {
  secret: config.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    httpOnly: true,
    maxAge: APP_CONSTANTS.TIME.SESSION_TIMEOUT,
  },
};

// CORS 설정
export const corsConfig = {
  origin: config.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

// API 설정
export const apiConfig = {
  timeout: APP_CONSTANTS.API.TIMEOUT,
  retries: APP_CONSTANTS.API.MAX_RETRIES,
  rateLimit: {
    windowMs: config.RATE_LIMIT_WINDOW,
    max: config.RATE_LIMIT_MAX,
  },
};

// OpenAI 설정
export const openaiConfig = {
  apiKey: config.OPENAI_API_KEY,
  timeout: APP_CONSTANTS.API.TIMEOUT,
  maxRetries: APP_CONSTANTS.API.MAX_RETRIES,
};

// WebSocket 설정
export const websocketConfig = {
  cors: {
    origin: config.CORS_ORIGIN,
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
};

// 캐시 설정
export const cacheConfig = {
  ttl: APP_CONSTANTS.TIME.ROOM_CLEANUP_PERIOD,
  max: APP_CONSTANTS.ROOM.MAX_ROOMS,
  checkperiod: 120, // 2분마다 체크
};

// 보안 설정
export const securityConfig = {
  helmet: {
    contentSecurityPolicy: isProduction ? {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    } : false,
  },
  rateLimit: {
    windowMs: config.RATE_LIMIT_WINDOW,
    max: config.RATE_LIMIT_MAX,
    message: 'Too many requests from this IP, please try again later.',
  },
};

// 모니터링 설정
export const monitoringConfig = {
  enabled: isProduction,
  metrics: {
    enabled: true,
    path: '/metrics',
  },
  healthCheck: {
    enabled: true,
    path: '/health',
  },
};

// 설정 검증 함수
export function validateConfig(): boolean {
  try {
    validateEnvironment();
    return true;
  } catch (error) {
    console.error('Configuration validation failed:', error);
    return false;
  }
}

// 설정 정보 출력 (개발 환경에서만)
export function logConfigInfo(): void {
  if (isDevelopment) {
    console.log('🔧 Configuration loaded:');
    console.log(`   Environment: ${config.NODE_ENV}`);
    console.log(`   Port: ${config.PORT}`);
    console.log(`   Log Level: ${config.LOG_LEVEL}`);
    console.log(`   CORS Origin: ${config.CORS_ORIGIN}`);
    console.log(`   Rate Limit: ${config.RATE_LIMIT_MAX} requests per ${config.RATE_LIMIT_WINDOW}ms`);
  }
}
