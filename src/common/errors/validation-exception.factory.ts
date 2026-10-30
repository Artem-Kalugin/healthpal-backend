import { Logger } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import {
  DEFAULT_RULE_CODES,
  isValidationCode,
  ValidationCode,
} from './validation-code';
import {
  ValidationErrors,
  ValidationFailedException,
  ValidationIssue,
} from './validation.exception';

const logger = new Logger('Validation');

const toIssue = (
  error: ValidationError,
  rule: string,
  message: string,
): ValidationIssue => {
  if (isValidationCode(message)) {
    const parameters = error.contexts?.[rule] as ValidationIssue['params'];
    return parameters
      ? { code: message, params: parameters }
      : { code: message };
  }

  const code = DEFAULT_RULE_CODES[rule];
  if (code) return { code };

  logger.warn(
    `Rule ${rule} of field ${error.property} has no code: ${message}`,
  );
  return { code: ValidationCode.INVALID_VALUE };
};

export const createValidationException = (
  validationErrors: ValidationError[] = [],
) => {
  const validation: ValidationErrors = {};

  for (const error of validationErrors) {
    if (!error.constraints) continue;
    validation[error.property] = Object.entries(error.constraints).map(
      ([rule, message]) => toIssue(error, rule, message),
    );
  }

  return new ValidationFailedException(validation);
};
