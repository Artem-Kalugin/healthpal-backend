/* eslint-disable @typescript-eslint/naming-convention */
import { JwtContent } from 'src/common/types/jwt-content.type';

declare global {
  namespace Express {
    interface Request {
      user?: JwtContent;
    }
  }
}

export interface EnvironmentVariables {
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;

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
