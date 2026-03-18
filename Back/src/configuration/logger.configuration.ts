import { ExceptionDTO } from '@/core/classes/dtos/exception.dto';

enum Color {
  WHITE = '\x1b[37m',
  DEFAULT = '\x1b[0m',
  PURPPLE = '\x1b[35m',
  GREEN = '\x1b[32m',
  YELLOW = '\x1b[33m',
  RED = '\x1b[31m',
}

export class Logger {
  private readonly context: string;

  constructor(context: string = '') {
    this.context = context;
  }

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

  private static log(
    level: string,
    message: string,
    color: Color = Color.WHITE,
  ): void {
    const messageReplace = message.replace('\n', '');
    console.log(
      `${color}[FIEP] - ${Color.WHITE}${new Date().toLocaleString('en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour12: true,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })}   ${color} ${level} ${messageReplace} ${Color.DEFAULT}`,
    );
  }

  /*********************************************
   *  Funções não estaticas
   *********************************************/
  public trace(message: string, color: Color = Color.WHITE): void {
    Logger.log(
      `[TRACE] ${Color.YELLOW}[${this.context}]${color}`,
      message,
      color,
    );
  }

  public debug(message: string, color: Color = Color.PURPPLE): void {
    Logger.log(
      `[DEBUG] ${Color.YELLOW}[${this.context}]${color}`,
      message,
      color,
    );
  }

  public info(message: string, color: Color = Color.GREEN): void {
    Logger.log(
      `[INFO ] ${Color.YELLOW}[${this.context}]${color}`,
      message,
      color,
    );
  }

  public warn(message: string, error?: any, color: Color = Color.YELLOW): void {
    Logger.log(
      `[WARN ] ${Color.YELLOW}[${this.context}]${color}`,
      `${message} ~ Exception: ${JSON.stringify(error, Logger.jsonErrorReplacer)}`,
      color,
    );
  }

  public error(message: string, error?: any, color: Color = Color.RED): void {
    Logger.log(
      `[ERROR] ${Color.YELLOW}[${this.context}]${color}`,
      `${message} ~ Exception: ${JSON.stringify(error, Logger.jsonErrorReplacer)}`,
      color,
    );
  }

  /*********************************************
   *  Funções estaticas
   *********************************************/
  public static startRoute(message: string, color: Color = Color.WHITE): void {
    this.log('[---->]', message, color);
  }

  public static finishRoute(message: string, color: Color = Color.WHITE): void {
    this.log('[<----]', message, color);
  }

  public static startJob(message: string, color: Color = Color.WHITE): void {
    this.log('[~~~~>]', message, color);
  }

  public static finishJob(message: string, color: Color = Color.WHITE): void {
    this.log('[<~~~~]', message, color);
  }

  public static trace(message: string, color: Color = Color.WHITE): void {
    this.log('[TRACE]', message, color);
  }

  public static debug(message: string, color: Color = Color.PURPPLE): void {
    this.log('[DEBUG]', message, color);
  }

  public static info(message: string, color: Color = Color.GREEN): void {
    this.log('[INFO ]', message, color);
  }

  public static warn(
    message: string,
    error?: any,
    color: Color = Color.YELLOW,
  ): void {
    this.log(
      '[WARN ]',
      `${message} ~ Exception: ${JSON.stringify(error, this.jsonErrorReplacer)}`,
      color,
    );
  }

  public static error(
    message: string,
    error?: any,
    color: Color = Color.RED,
  ): void {
    this.log(
      '[ERROR]',
      `${message} ~ Exception: ${JSON.stringify(error, this.jsonErrorReplacer)}`,
      Color.RED,
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
