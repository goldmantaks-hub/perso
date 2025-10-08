import { config, isDevelopment } from './config.js';
import { LOG_LEVELS } from './constants.js';

// 로그 레벨 타입
type LogLevel = 'error' | 'warn' | 'info' | 'debug';

// 로그 레벨 우선순위
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// 로그 색상
const LOG_COLORS: Record<LogLevel, string> = {
  error: '\x1b[31m', // 빨간색
  warn: '\x1b[33m',  // 노란색
  info: '\x1b[36m',  // 청록색
  debug: '\x1b[90m', // 회색
};

// 리셋 색상
const RESET_COLOR = '\x1b[0m';

// 로거 클래스
class Logger {
  private level: LogLevel;
  private colorize: boolean;

  constructor() {
    this.level = config.LOG_LEVEL;
    this.colorize = isDevelopment;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] <= LOG_LEVEL_PRIORITY[this.level];
  }

  private formatMessage(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const levelStr = level.toUpperCase().padEnd(5);
    
    let formattedMessage = `[${timestamp}] ${levelStr} ${message}`;
    
    if (meta) {
      formattedMessage += ` ${JSON.stringify(meta)}`;
    }
    
    if (this.colorize) {
      const color = LOG_COLORS[level];
      formattedMessage = `${color}${formattedMessage}${RESET_COLOR}`;
    }
    
    return formattedMessage;
  }

  private log(level: LogLevel, message: string, meta?: any): void {
    if (!this.shouldLog(level)) {
      return;
    }
    
    const formattedMessage = this.formatMessage(level, message, meta);
    console.log(formattedMessage);
  }

  error(message: string, meta?: any): void {
    this.log('error', message, meta);
  }

  warn(message: string, meta?: any): void {
    this.log('warn', message, meta);
  }

  info(message: string, meta?: any): void {
    this.log('info', message, meta);
  }

  debug(message: string, meta?: any): void {
    this.log('debug', message, meta);
  }

  // 특별한 로그 메서드들
  api(method: string, path: string, statusCode: number, duration: number, response?: any): void {
    const message = `${method} ${path} ${statusCode} in ${duration}ms`;
    const meta = response ? { response } : undefined;
    
    if (statusCode >= 400) {
      this.error(message, meta);
    } else if (statusCode >= 300) {
      this.warn(message, meta);
    } else {
      this.info(message, meta);
    }
  }

  websocket(event: string, data?: any): void {
    this.debug(`WebSocket: ${event}`, data);
  }

  persona(action: string, personaId: string, meta?: any): void {
    this.info(`Persona ${action}: ${personaId}`, meta);
  }

  room(action: string, roomId: string, meta?: any): void {
    this.info(`Room ${action}: ${roomId}`, meta);
  }

  jackpot(personaId: string, multiplier: number): void {
    this.info(`🎰 JACKPOT! ${personaId} - growth x${multiplier}`);
  }

  performance(operation: string, duration: number, meta?: any): void {
    const message = `${operation} completed in ${duration}ms`;
    const performanceMeta = { ...meta, duration };
    
    if (duration > 5000) {
      this.warn(`Slow operation: ${message}`, performanceMeta);
    } else if (duration > 1000) {
      this.info(message, performanceMeta);
    } else {
      this.debug(message, performanceMeta);
    }
  }

  // 구조화된 로깅
  structured(level: LogLevel, message: string, context: Record<string, any>): void {
    const meta = {
      ...context,
      timestamp: new Date().toISOString(),
      level,
    };
    
    this.log(level, message, meta);
  }

  // 에러 로깅 (스택 트레이스 포함)
  errorWithStack(message: string, error: Error, meta?: any): void {
    const errorMeta = {
      ...meta,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    };
    
    this.error(message, errorMeta);
  }

  // 성능 측정 헬퍼
  time(label: string): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.performance(label, duration);
    };
  }
}

// 싱글톤 인스턴스 생성
export const logger = new Logger();

// 편의 함수들
export const log = logger.info.bind(logger);
export const logError = logger.error.bind(logger);
export const logWarn = logger.warn.bind(logger);
export const logDebug = logger.debug.bind(logger);

// 특별한 로그 함수들
export const logApi = logger.api.bind(logger);
export const logWebSocket = logger.websocket.bind(logger);
export const logPersona = logger.persona.bind(logger);
export const logRoom = logger.room.bind(logger);
export const logJackpot = logger.jackpot.bind(logger);
export const logPerformance = logger.performance.bind(logger);
export const logStructured = logger.structured.bind(logger);
export const logErrorWithStack = logger.errorWithStack.bind(logger);
export const time = logger.time.bind(logger);

// 로그 레벨 변경 함수
export function setLogLevel(level: LogLevel): void {
  (logger as any).level = level;
}

// 로그 색상 토글 함수
export function toggleColors(): void {
  (logger as any).colorize = !(logger as any).colorize;
}
