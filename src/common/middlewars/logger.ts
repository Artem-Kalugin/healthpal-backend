import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(request: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = request;
    const userAgent = request.get('user-agent') || '';
    const ip = request.ip;

    const authHeader = request.get('authorization');
    const token = authHeader?.split(' ')[1] ?? null;

    res.on('finish', () => {
      const { statusCode } = res;
      const contentLength = res.get('content-length');

      this.logger.log(
        `${method} ${originalUrl} ${statusCode} ${contentLength || 0} - token: ${
          token?.slice(0, 8) ?? 'none'
        } - ${userAgent} ${ip}`,
      );
    });

    next();
  }
}
