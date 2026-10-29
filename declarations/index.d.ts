/* eslint-disable @typescript-eslint/naming-convention */
export interface JwtContent {
  id: string;
  registrationComplete?: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtContent;
    }
  }
}

export interface EnvironmentVariables {
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_TTL: string;

  DATABASE_HOST?: string;
  DATABASE_PORT?: number;
  DATABASE_NAME?: string;
  PORT?: number;

  DATABASE_USER: string;
  DATABASE_PASSWORD: string;

  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD: string;
  REDIS_DB: number;

  OTP_TTL: number;
  RECOVERY_TTL: number;
  OTP_HMAC_SECRET: string;
}
