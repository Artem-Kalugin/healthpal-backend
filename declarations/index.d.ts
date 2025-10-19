/* eslint-disable @typescript-eslint/naming-convention */
import { JoinColumnOptions, JoinTableOptions } from 'typeorm';

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

type ManyToManyJoinOptions = RequiredAll<
  Pick<JoinTableOptions, 'name' | 'joinColumn' | 'inverseJoinColumn'>
>;
type ManyToOneJoinOptions = RequiredAll<Pick<JoinColumnOptions, 'name'>> &
  Omit<JoinColumnOptions, 'name'>;

type MinimalManyToManyJoinOptions =
  | ManyToManyJoinOptions
  | ManyToOneJoinOptions;

type RequiredAll<T> = {
  [K in keyof T]-?: T[K];
};

type AliasedSlugs<
  Alias extends string,
  T extends object,
> = `${Alias}.${keyof T}`;
export interface EnvironmentVariables {
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_TTL: string;

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
