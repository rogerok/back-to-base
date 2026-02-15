import { Logger } from "./logger.ts";

export class ConsoleLogger extends Logger {
  protected _writeMessage(message: string): void {
    console.log(`[${this.level}]: ${message}`);
  }
}
