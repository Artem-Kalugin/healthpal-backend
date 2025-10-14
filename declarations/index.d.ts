/* eslint-disable @typescript-eslint/naming-convention */
import { JwtContent } from 'src/common/types/jwt-content.type';
import { JoinTableOptions } from 'typeorm';

declare global {
  namespace Express {
    interface Request {
      user?: JwtContent;
    }
  }
}

type MinimalManyToManyJoinOptions = RequiredAll<
  Pick<JoinTableOptions, 'name' | 'joinColumn' | 'inverseJoinColumn'>
>;

type RequiredAll<T> = {
  [K in keyof T]-?: T[K];
};

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
