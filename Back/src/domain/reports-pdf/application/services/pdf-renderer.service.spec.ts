import { HttpException, HttpStatus } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ValidationError } from '@/shared/errors/validation.error';

const state = vi.hoisted(() => ({
  activeLaunches: 0,
  maxActiveLaunches: 0,
  pendingPdfResolvers: [] as Array<() => void>,
}));

vi.mock('playwright', () => ({
  chromium: {
    launch: vi.fn(async () => {
      state.activeLaunches += 1;
      state.maxActiveLaunches = Math.max(
        state.maxActiveLaunches,
        state.activeLaunches,
      );

      return {
        newPage: vi.fn(async () => ({
          setContent: vi.fn(async () => undefined),
          pdf: vi.fn(
            () =>
              new Promise<Buffer>((resolve) => {
                state.pendingPdfResolvers.push(() =>
                  resolve(Buffer.from('pdf')),
                );
              }),
          ),
        })),
        close: vi.fn(async () => {
          state.activeLaunches -= 1;
        }),
      };
    }),
  },
}));

import { PdfRendererService } from './pdf-renderer.service';

/**
 * Waits (polling with real timers) until at least `count` pdf() calls are
 * blocked waiting to be resolved, then resolves all of them. Repeats until
 * `expectedTotal` renders have been released in total. This avoids hardcoding
 * a fixed number of microtask ticks, which is brittle given the multiple
 * chained awaits inside PdfRendererService (launch -> newPage -> setContent
 * -> pdf).
 */
async function releaseAllRenders(expectedTotal: number): Promise<void> {
  let released = 0;
  while (released < expectedTotal) {
    await vi.waitFor(
      () => {
        if (state.pendingPdfResolvers.length === 0) {
          throw new Error('waiting for next batch of renders to start');
        }
      },
      { timeout: 2000, interval: 5 },
    );

    const resolvers = state.pendingPdfResolvers.splice(0);
    resolvers.forEach((resolve) => resolve());
    released += resolvers.length;
  }
}

describe('PdfRendererService concurrency limiter', () => {
  let service: PdfRendererService;

  beforeEach(() => {
    service = new PdfRendererService();
    state.activeLaunches = 0;
    state.maxActiveLaunches = 0;
    state.pendingPdfResolvers = [];
  });

  it('never launches more than 2 browsers at the same time', async () => {
    const renders = [
      service.renderFromHtml('<p>1</p>'),
      service.renderFromHtml('<p>2</p>'),
      service.renderFromHtml('<p>3</p>'),
      service.renderFromHtml('<p>4</p>'),
      service.renderFromHtml('<p>5</p>'),
    ];

    await Promise.all([releaseAllRenders(5), ...renders]);

    expect(state.maxActiveLaunches).toBeLessThanOrEqual(2);
    expect(state.activeLaunches).toBe(0);
  });

  it('rejects with 429 once the running + queued renders exceed the limit', async () => {
    // 2 concurrent slots + 3 queue slots = 5 accepted requests.
    const accepted = Array.from({ length: 5 }, (_, index) =>
      service.renderFromHtml(`<p>${index}</p>`),
    );

    const overflow = await service
      .renderFromHtml('<p>overflow</p>')
      .then(() => null)
      .catch((error) => error as HttpException);

    expect(overflow).toBeInstanceOf(HttpException);
    expect(overflow?.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);

    await Promise.all([releaseAllRenders(5), ...accepted]);
  });

  it('aborts and closes the browser when rendering exceeds the timeout', async () => {
    vi.useFakeTimers();

    try {
      const renderPromise = service.renderFromHtml('<p>slow</p>');
      const errorPromise = renderPromise
        .then(() => null)
        .catch((error) => error as ValidationError);

      await vi.advanceTimersByTimeAsync(30_000);
      const error = await errorPromise;

      expect(error).toBeInstanceOf(ValidationError);
      expect(error?.getResponse()).toMatchObject({
        error: { message: expect.stringMatching(/timed out/i) },
      });
      expect(state.activeLaunches).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
