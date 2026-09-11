import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Simple counter + queue based concurrency limiter.
 *
 * Bounds how many async tasks can run at the same time. Once the running
 * count hits `maxConcurrent`, further calls wait in a queue up to
 * `maxQueueSize`. Once the queue is also full, new calls are rejected
 * immediately with a 429 instead of piling up indefinitely.
 */
export class ConcurrencyLimiter {
  private running = 0;
  private readonly queue: Array<() => void> = [];

  constructor(
    private readonly maxConcurrent: number,
    private readonly maxQueueSize: number,
  ) {}

  async run<T>(task: () => Promise<T>): Promise<T> {
    await this.acquire();

    try {
      return await task();
    } finally {
      this.release();
    }
  }

  private async acquire(): Promise<void> {
    if (this.running < this.maxConcurrent) {
      this.running += 1;
      return;
    }

    if (this.queue.length >= this.maxQueueSize) {
      throw new HttpException(
        {
          data: null,
          error: {
            code: 'TOO_MANY_REQUESTS',
            message:
              'Muitas geracoes de PDF em andamento, tente novamente em instantes.',
            details: null,
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    await new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
    this.running += 1;
  }

  private release(): void {
    this.running -= 1;
    const next = this.queue.shift();
    if (next) {
      next();
    }
  }
}
