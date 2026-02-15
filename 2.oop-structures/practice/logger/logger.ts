export type LoggerLevel = "debug" | "error" | "info" | "warning";

export class Logger {
  levels: Record<LoggerLevel, number> = {
    debug: 1,
    error: 4,
    info: 2,
    warning: 3,
  };

  constructor(public level: LoggerLevel = "warning") {}

  getLevelPriority(level: LoggerLevel): number {
    return this.levels[level];
  }

  log(message: string, level: LoggerLevel): void {
    if (this.getLevelPriority(level) >= this.getLevelPriority(this.level)) {
      this._writeMessage(message, level);
    }
  }

  debug(message: string): void {
    this.log(message, "debug");
  }

  info(message: string): void {
    this.log(message, "info");
  }

  warning(message: string): void {
    this.log(message, "warning");
  }

  error(message: string): void {
    this.log(message, "error");
  }

  protected _writeMessage(message: string, level: LoggerLevel): void {
    throw new Error("_writeMessage must be implemented in a subclass");
  }
}
