type LoggerLevel = "debug" | "error" | "info" | "warning";

export class Logger {
  levels: Record<LoggerLevel, number> = {
    debug: 1,
    error: 4,
    info: 2,
    warning: 3,
  };

  constructor(public level: LoggerLevel = "warning") {}

  log(message: string, level: LoggerLevel): void {
    if (level >= this.level) {
      this._writeMessage(message);
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

  protected _writeMessage(message: string): void {
    throw new Error("_writeMessage must be implemented in a subclass");
  }
}
