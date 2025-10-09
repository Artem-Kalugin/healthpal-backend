import { UnauthorizedException } from '@nestjs/common';

// eslint-disable-next-line
//TODO: create internal error, dont inherit http
export class AuthError extends UnauthorizedException {
  constructor(message: string) {
    super(message);
  }
}
