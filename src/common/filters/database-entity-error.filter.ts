import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { DatabaseEntityError } from '../errors/database-entity/database-entity.error';
import { Response } from 'express';

@Catch(DatabaseEntityError)
export class DatabaseEntityErrorFilter implements ExceptionFilter {
  catch(exception: DatabaseEntityError, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    console.error(
      `[DB ERROR] ${exception.name} at ${request.method} ${request.url}:`,
      exception.originalError,
    );

    response.status(exception.status).json({ message: exception.message });
  }
}
