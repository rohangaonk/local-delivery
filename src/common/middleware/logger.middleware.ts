import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') ?? '';
    const startAt = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const contentLength = res.get('content-length') ?? '-';
      const duration = Date.now() - startAt;

      this.logger.log(
        `${method} ${originalUrl} ${statusCode} ${contentLength}b — ${duration}ms — ${ip} — ${userAgent}`,
      );
    });

    next();
  }
}
