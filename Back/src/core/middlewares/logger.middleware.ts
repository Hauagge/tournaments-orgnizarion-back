import { Logger } from '@/configuration/logger.configuration';
import { Injectable, NestMiddleware } from '@nestjs/common';
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    const startTime = Date.now();

    req.once('readable', () => {
      Logger.startRoute(
        `${req.method} ${req.url} HTTP/${req?.httpVersion} ${req.headers?.['user-agent']}`,
      );
    });

    res.once('finish', () => {
      const duration = Date.now() - startTime;
      const logMessage = `${req.method} ${req.url} ${res.statusCode} - ${duration}ms`;

      Logger.finishRoute(logMessage);
    });

    next();
  }
}
