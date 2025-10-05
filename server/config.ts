const isDevelopment = process.env.NODE_ENV === 'development';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    if (isDevelopment) {
      console.warn('⚠️  WARNING: Using default JWT_SECRET in development. DO NOT use in production!');
      return 'dev-secret-key-change-in-production';
    } else {
      throw new Error('FATAL: JWT_SECRET environment variable is required in production');
    }
  }
  
  if (secret.length < 32) {
    throw new Error('FATAL: JWT_SECRET must be at least 32 characters long');
  }
  
  return secret;
}

export const config = {
  jwtSecret: getJwtSecret(),
  isDevelopment,
} as const;
