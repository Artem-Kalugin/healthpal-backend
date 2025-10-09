/* eslint-disable @typescript-eslint/naming-convention */
import * as Joi from 'joi';

export const environmentValidationSchema = Joi.object({
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
});
