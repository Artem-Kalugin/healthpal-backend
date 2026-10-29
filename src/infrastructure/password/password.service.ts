import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class PasswordService {
  async hash(password: string) {
    return bcrypt.hash(password, 10);
  }

  async compare(plain: string, hash: string) {
    return bcrypt.compare(plain, hash);
  }
}
