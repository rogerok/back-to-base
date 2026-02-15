import fs from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ConsoleLogger } from "./console-logger.ts";
import { FileLogger } from "./file-logger.ts";
import { Logger } from "./logger.ts";

describe("Logger", () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger();
  });

  it("should be created with specified level", () => {
    expect(new Logger("debug")["level"]).toBe("debug");
    expect(new Logger("warning")["level"]).toBe("warning");
  });

  it("call _writeMessage for messages with appropriate level", () => {
    logger["level"] = "warning";
    logger["_writeMessage"] = vi.fn();

    logger.info("Информационное сообщение");
    expect(logger["_writeMessage"]).not.toHaveBeenCalled();

    logger.warning("Предупреждение");
    expect(logger["_writeMessage"]).toHaveBeenCalledWith("Предупреждение", "warning");

    logger.error("Ошибка");
    expect(logger["_writeMessage"]).toHaveBeenCalledWith("Ошибка", "error");
  });

  it("do not call _writeMessage for messages with lower level", () => {
    logger["level"] = "error";
    logger["_writeMessage"] = vi.fn();

    logger.debug("Отладочное сообщение");
    logger.info("Информационное сообщение");
    logger.warning("Предупреждение");

    expect(logger["_writeMessage"]).not.toHaveBeenCalled();
  });

  it("throw error if _writeMessage is not implemented", () => {
    expect(() => { logger["_writeMessage"]("Тест", "info"); }).toThrow(
      "_writeMessage must be implemented in a subclass",
    );
  });
});

describe("ConsoleLogger", () => {
  const spy = vi.spyOn(console, "log").mockImplementation(() => {});

  let consoleLogger: ConsoleLogger;

  beforeEach(() => {
    consoleLogger = new ConsoleLogger("info");
  });

  afterEach(() => {
    spy.mockClear();
  });

  it("should log messages with level >= current level", () => {
    consoleLogger.info("Тестовое сообщение");
    expect(console.log).toHaveBeenCalledWith("[INFO]: Тестовое сообщение");
  });

  it("should not log messages with level < current level", () => {
    consoleLogger.debug("Отладочное сообщение");
    expect(console.log).not.toHaveBeenCalled();
  });
});

describe("FileLogger", () => {
  const testFilename = "test.log";
  let logger: FileLogger;

  beforeEach(() => {
    logger = new FileLogger("debug", testFilename);
  });

  afterEach(() => {
    if (fs.existsSync(testFilename)) {
      fs.unlinkSync(testFilename);
    }
    vi.restoreAllMocks();
  });

  it("should create a file logger with the correct level and filename", () => {
    expect(logger["level"]).toBe("debug");
    expect(logger["fileName"]).toBe(testFilename);
  });

  it("should write messages to the file with correct format", () => {
    logger.debug("Это debug message");
    logger.info("Это info message");

    const logContent = fs.readFileSync(testFilename, "utf8");

    expect(logContent).toMatch(/\[\w+\]: /);
    expect(logContent).toContain("Это debug message");
    expect(logContent).toContain("Это info message");
  });

  it("should only log messages at or above the specified level", () => {
    logger = new FileLogger("warning", testFilename);

    logger.debug("Это debug message");
    logger.warning("Это warning message");

    const logContent = fs.readFileSync(testFilename, "utf8");

    expect(logContent).not.toContain("Это debug message");
    expect(logContent).toContain("Это warning message");
  });

  it("should handle errors during file writing", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    vi.spyOn(fs, "appendFileSync").mockImplementation(() => {
      throw new Error("Mock file system error");
    });

    logger.error("This will throw an error during writing");

    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
