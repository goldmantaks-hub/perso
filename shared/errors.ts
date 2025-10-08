import { ERROR_MESSAGES } from './constants.js';

// 기본 에러 클래스
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;

    // 스택 트레이스 보존
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// 인증 에러
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed', context?: Record<string, any>) {
    super(message, 401, true, context);
  }
}

// 권한 에러
export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied', context?: Record<string, any>) {
    super(message, 403, true, context);
  }
}

// 유효성 검사 에러
export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', context?: Record<string, any>) {
    super(message, 400, true, context);
  }
}

// 리소스 없음 에러
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', context?: Record<string, any>) {
    super(message, 404, true, context);
  }
}

// 충돌 에러
export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict', context?: Record<string, any>) {
    super(message, 409, true, context);
  }
}

// 요청 한도 초과 에러
export class RateLimitError extends AppError {
  constructor(message: string = ERROR_MESSAGES.RATE_LIMIT_EXCEEDED, context?: Record<string, any>) {
    super(message, 429, true, context);
  }
}

// 서버 에러
export class ServerError extends AppError {
  constructor(message: string = 'Internal server error', context?: Record<string, any>) {
    super(message, 500, false, context);
  }
}

// 페르소나 관련 에러들
export class PersonaError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 400, true, context);
  }
}

export class PersonaNotFoundError extends PersonaError {
  constructor(personaId: string) {
    super(ERROR_MESSAGES.PERSONA_NOT_FOUND, { personaId });
  }
}

export class InsufficientSentimentError extends PersonaError {
  constructor(actual: number, required: number) {
    super(ERROR_MESSAGES.INSUFFICIENT_POSITIVE_SENTIMENT, { actual, required });
  }
}

export class InsufficientSimilarityError extends PersonaError {
  constructor(actual: number, required: number) {
    super(ERROR_MESSAGES.INSUFFICIENT_SIMILARITY, { actual, required });
  }
}

export class CooldownActiveError extends PersonaError {
  constructor(remainingTime: number) {
    super(ERROR_MESSAGES.COOLDOWN_ACTIVE, { remainingTime });
  }
}

export class DuplicateContentError extends PersonaError {
  constructor(contentHash: string) {
    super(ERROR_MESSAGES.DUPLICATE_CONTENT, { contentHash });
  }
}

// 룸 관련 에러들
export class RoomError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 400, true, context);
  }
}

export class RoomNotFoundError extends RoomError {
  constructor(roomId: string) {
    super(ERROR_MESSAGES.ROOM_NOT_FOUND, { roomId });
  }
}

export class RoomFullError extends RoomError {
  constructor(roomId: string, currentCount: number, maxCount: number) {
    super('Room is full', { roomId, currentCount, maxCount });
  }
}

// API 관련 에러들
export class APIError extends AppError {
  constructor(message: string, statusCode: number = 500, context?: Record<string, any>) {
    super(message, statusCode, true, context);
  }
}

export class OpenAIError extends APIError {
  constructor(message: string, context?: Record<string, any>) {
    super(`OpenAI API error: ${message}`, 502, context);
  }
}

export class DatabaseError extends APIError {
  constructor(message: string, context?: Record<string, any>) {
    super(`Database error: ${message}`, 500, context);
  }
}

// 에러 처리 유틸리티 함수들
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

export function getErrorStatusCode(error: Error): number {
  if (error instanceof AppError) {
    return error.statusCode;
  }
  return 500;
}

export function getErrorMessage(error: Error): string {
  if (error instanceof AppError) {
    return error.message;
  }
  return 'Internal server error';
}

export function getErrorContext(error: Error): Record<string, any> | undefined {
  if (error instanceof AppError) {
    return error.context;
  }
  return undefined;
}

// 에러 로깅 헬퍼
export function logError(error: Error, context?: Record<string, any>): void {
  const errorContext = {
    ...context,
    ...getErrorContext(error),
    name: error.name,
    message: error.message,
    stack: error.stack,
    isOperational: isOperationalError(error),
  };

  if (error instanceof AppError) {
    console.error(`[${error.name}] ${error.message}`, errorContext);
  } else {
    console.error(`[Unknown Error] ${error.message}`, errorContext);
  }
}

// 에러 응답 생성 헬퍼
export function createErrorResponse(error: Error): {
  error: string;
  message: string;
  statusCode: number;
  context?: Record<string, any>;
} {
  return {
    error: error.name,
    message: getErrorMessage(error),
    statusCode: getErrorStatusCode(error),
    context: getErrorContext(error),
  };
}

// 에러 타입 가드 함수들
export function isAppError(error: Error): error is AppError {
  return error instanceof AppError;
}

export function isAuthenticationError(error: Error): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

export function isValidationError(error: Error): error is ValidationError {
  return error instanceof ValidationError;
}

export function isNotFoundError(error: Error): error is NotFoundError {
  return error instanceof NotFoundError;
}

export function isPersonaError(error: Error): error is PersonaError {
  return error instanceof PersonaError;
}

export function isRoomError(error: Error): error is RoomError {
  return error instanceof RoomError;
}

export function isAPIError(error: Error): error is APIError {
  return error instanceof APIError;
}
