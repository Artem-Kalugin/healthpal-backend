/* eslint-disable @typescript-eslint/naming-convention */

import { EnvironmentVariables } from 'declarations';
import * as Joi from 'joi';

const validationSchemaRaw: { [x in keyof EnvironmentVariables]: any } = {
  JWT_SECRET: Joi.string().min(32).required().messages({
    'any.required': 'JWT_SECRET is required',
    'string.min': 'JWT_SECRET should be at least 32 characters long',
  }),
  JWT_EXPIRES_IN: Joi.string()
    .pattern(/^\d+[smhd]$/)
    .required()
    .messages({
      'any.required': 'JWT_EXPIRES_IN is required',
      'string.pattern.base':
        'JWT_EXPIRES_IN must be in format 60s, 1h, 1d etc.',
    }),

  DATABASE_USER: Joi.string().required().messages({
    'any.required': 'DATABASE_USER is required',
  }),
  DATABASE_PASSWORD: Joi.string().required().messages({
    'any.required': 'DATABASE_PASSWORD is required',
  }),

  REDIS_HOST: Joi.string().hostname().required().messages({
    'any.required': 'REDIS_HOST is required',
    'string.hostname': 'REDIS_HOST must be a valid hostname',
  }),
  REDIS_PORT: Joi.number().port().required().messages({
    'any.required': 'REDIS_PORT is required',
    'number.port': 'REDIS_PORT must be a valid port number',
  }),
  REDIS_PASSWORD: Joi.string().allow('').messages({
    'string.base': 'REDIS_PASSWORD must be a string',
  }),
  REDIS_DB: Joi.number().integer().min(0).default(0).messages({
    'number.base': 'REDIS_DB must be a number',
    'number.min': 'REDIS_DB cannot be negative',
  }),

  OTP_TTL: Joi.number().integer().positive().required().messages({
    'any.required': 'OTP_TTL is required',
    'number.base': 'OTP_TTL must be a number',
    'number.positive': 'OTP_TTL must be positive',
  }),
  RECOVERY_TTL: Joi.number().integer().positive().required().messages({
    'any.required': 'RECOVERY_TTL is required',
    'number.base': 'RECOVERY_TTL must be a number',
    'number.positive': 'RECOVERY_TTL must be positive',
  }),
  OTP_HMAC_SECRET: Joi.string().min(16).required().messages({
    'any.required': 'OTP_HMAC_SECRET is required',
    'string.min': 'OTP_HMAC_SECRET should be at least 16 characters long',
  }),
};

export const environmentValidationSchema = Joi.object(validationSchemaRaw);
