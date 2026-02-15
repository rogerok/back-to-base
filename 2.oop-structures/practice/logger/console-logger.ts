import { Logger, LoggerLevel } from "./logger.ts";

export class ConsoleLogger extends Logger {
  protected _writeMessage(message: string, level: LoggerLevel): void {
    console.log(`[${level.toUpperCase()}]: ${message}`);
  }
}
