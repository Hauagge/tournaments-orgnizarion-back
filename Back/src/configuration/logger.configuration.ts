/* eslint-disable @typescript-eslint/no-unused-expressions */

import { ExceptionDTO } from '@/core/classes/dtos/exception.dto';

export class Logger {
  private static jsonErrorReplacer(
    _key: any,
    value: { name: any; message: any; stack: any },
  ): { name: any; message: any; stack: any } {
    return value instanceof Error
      ? {
          ...value,
          name: value.name,
          message: value.message,
          stack: value.stack,
        }
      : value;
  }

  private static log(level: string, message: string): void {
    const messageReplace = message.replace('\n', '');
    console.log(`${new Date().toJSON()} ${level} ${messageReplace}`);
  }

  public static startRoute(message: string): void {
    this.log('[---->]', message);
  }

  public static finishRoute(message: string): void {
    this.log('[<----]', message);
  }

  public static startJob(message: string): void {
    this.log('[~~~~>]', message);
  }

  public static finishJob(message: string): void {
    this.log('[<~~~~]', message);
  }

  public static trace(message: string): void {
    this.log('[TRACE]', message);
  }

  public static debug(message: string): void {
    this.log('[DEBUG]', message);
  }

  public static info(message: string): void {
    this.log('[INFO ]', message);
  }

  public static warn(message: string, error?: any): void {
    this.log(
      '[WARN ]',
      `${message} ~ Exception: ${JSON.stringify(error, this.jsonErrorReplacer)}`,
    );
  }

  public static error(message: string, error?: any): void {
    this.log(
      '[ERROR]',
      `${message} ~ Exception: ${JSON.stringify(error, this.jsonErrorReplacer)}`,
    );
  }
  public static infer(message: string, error: any): void {
    if (error && error instanceof ExceptionDTO) {
      const { type, ...exceptionDTO } = error;
      type === 'WARN'
        ? this.warn(message, exceptionDTO)
        : this.error(message, exceptionDTO);
    } else this.error(message, error);
  }
}
