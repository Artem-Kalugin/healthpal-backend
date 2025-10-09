import { JwtContent } from 'src/common/types/jwt-content.type';

declare global {
  namespace Express {
    interface Request {
      user?: JwtContent;
    }
  }
}

export interface EnvironmentVariables {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  JWT_SECRET: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  JWT_EXPIRES_IN: string;
}
