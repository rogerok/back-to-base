import { appendFileSync } from "node:fs";

import { Logger, LoggerLevel } from "./logger.ts";

export class FileLogger extends Logger {
  constructor(
    level: LoggerLevel,
    private fileName: string,
  ) {
    super(level);
  }

  _writeMessage(message: string, level: LoggerLevel): void {
    const msg = `${new Date().toISOString()} [${level.toUpperCase()}]: ${message}\n`;

    try {
      appendFileSync(this.fileName, msg);
    } catch (err) {
      console.log("Ошибка записи в файл: ", err);
    }
  }
}
