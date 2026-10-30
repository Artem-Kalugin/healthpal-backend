import { ErrorCode } from './error-code';
import { AppException } from './app.exception';
import { ValidationCode } from './validation-code';

export interface ValidationIssue {
  code: ValidationCode;
  params?: Record<string, unknown>;
}

/** `{ field: [violated rules] }`: goes into the response body next to `statusCode` and `code`. */
export type ValidationErrors = Record<string, ValidationIssue[]>;

export class ValidationFailedException extends AppException {
  constructor(readonly validation: ValidationErrors) {
    super(ErrorCode.VALIDATION_FAILED, {
      message: Object.entries(validation)
        .map(
          ([field, issues]) =>
            `${field}: ${issues.map(issue => issue.code).join(',')}`,
        )
        .join('; '),
    });
  }
}
