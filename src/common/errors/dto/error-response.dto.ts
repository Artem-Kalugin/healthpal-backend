import {
  ApiExtraModels,
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath,
} from '@nestjs/swagger';
import { CLIENT_ERROR_CODES, ErrorCode } from '../error-code';
import { ValidationCode } from '../validation-code';

/** Documentation only: `AppErrorFilter` writes the body itself, these classes are never serialized. */
export class ErrorResponseDto {
  statusCode: number;

  // the published enum is a subset of `ErrorCode`, the rule cannot see that
  // eslint-disable-next-line @darraghor/nestjs-typed/api-enum-property-best-practices
  @ApiProperty({
    enum: CLIENT_ERROR_CODES,
    enumName: 'ErrorCode',
    description:
      'Codes the client localizes by. Log-only codes are not listed.',
  })
  code: ErrorCode;
}

export class ValidationIssueParametersDto {
  @ApiPropertyOptional({
    description: 'TEXT_TOO_*, VALUE_TOO_*, PASSWORD_TOO_*',
  })
  limit?: number;

  @ApiPropertyOptional({ description: 'OTP_FORMAT' })
  length?: number;
}

export class ValidationIssueDto {
  @ApiProperty({ enum: ValidationCode, enumName: 'ValidationCode' })
  code: ValidationCode;

  @ApiPropertyOptional({ type: ValidationIssueParametersDto })
  params?: ValidationIssueParametersDto;
}

@ApiExtraModels(ValidationIssueDto)
export class ValidationErrorResponseDto {
  statusCode: number;

  // eslint-disable-next-line @darraghor/nestjs-typed/api-enum-property-best-practices -- a single literal, a named enum would duplicate `ErrorCode`
  @ApiProperty({ enum: [ErrorCode.VALIDATION_FAILED] })
  code: ErrorCode.VALIDATION_FAILED;

  @ApiProperty({
    type: 'object',
    additionalProperties: {
      type: 'array',
      items: { $ref: getSchemaPath(ValidationIssueDto) },
    },
    description: 'Violated rules by body or query field name.',
  })
  validation: Record<string, ValidationIssueDto[]>;
}

/** Passed to `SwaggerModule.createDocument` so the schemas are published without being tied to an endpoint. */
export const ERROR_RESPONSE_MODELS = [
  ErrorResponseDto,
  ValidationErrorResponseDto,
];
