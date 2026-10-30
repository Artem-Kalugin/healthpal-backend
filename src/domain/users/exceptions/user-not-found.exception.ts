import { AppException } from 'src/common/errors/app.exception';
import { ErrorCode } from 'src/common/errors/error-code';

export class UserNotFoundException extends AppException {
  constructor() {
    super(ErrorCode.USER_NOT_FOUND);
  }
}
