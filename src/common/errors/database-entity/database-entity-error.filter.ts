import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { DatabaseEntityError } from './database-entity.error';
import { Request, Response } from 'express';

@Catch(DatabaseEntityError)
export class DatabaseEntityErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(DatabaseEntityErrorFilter.name);

  catch(exception: DatabaseEntityError, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    this.logger.error(
      `${exception.name} at ${request.method} ${request.url}`,
      exception.originalError instanceof Error
        ? exception.originalError.stack
        : String(exception.originalError),
    );

    response.status(exception.status).json({ message: exception.message });
  }
}
