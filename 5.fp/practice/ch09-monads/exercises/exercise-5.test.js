import { describe, expect, it } from "vitest";

import { applyTheme, createDOM, createStorage, extractTheme, loadAndApplyTheme, parseConfig, tryCatch, validateTheme } from "./exercise-5.js";
import { foldEither } from "./test-helpers.js";

describe("exercise-5.js", () => {
  it("tryCatch", () => {
    expect(foldEither(tryCatch(() => JSON.parse('{"a":1}')))).toBe('RIGHT:{"a":1}');
    expect(foldEither(tryCatch(() => JSON.parse("bad")))?.startsWith("LEFT:")).toBe(true);
    expect(foldEither(tryCatch(() => { throw new Error("oops"); }))).toBe("LEFT:oops");
    expect(foldEither(tryCatch(() => 2 + 2))).toBe("RIGHT:4");
  });

  it("parseConfig", () => {
    expect(foldEither(parseConfig('{"theme":"dark"}'))).toBe('RIGHT:{"theme":"dark"}');
    expect(foldEither(parseConfig(null))).toBe("LEFT:Конфиг не найден");
    expect(foldEither(parseConfig("bad json"))?.startsWith("LEFT:Некорректный JSON")).toBe(true);
  });

  it("extractTheme", () => {
    expect(foldEither(extractTheme({ theme: "dark", lang: "ru" }))).toBe("RIGHT:dark");
    expect(foldEither(extractTheme({ lang: "ru" }))).toBe("LEFT:Тема не указана в конфиге");
    expect(foldEither(extractTheme({}))).toBe("LEFT:Тема не указана в конфиге");
  });

  it("validateTheme", () => {
    expect(foldEither(validateTheme("dark"))).toBe("RIGHT:dark");
    expect(foldEither(validateTheme("light"))).toBe("RIGHT:light");
    expect(foldEither(validateTheme("system"))).toBe("RIGHT:system");
    expect(foldEither(validateTheme("purple"))?.startsWith("LEFT:Недопустимая тема")).toBe(true);
    expect(foldEither(validateTheme(""))?.startsWith("LEFT:Недопустимая тема")).toBe(true);
  });

  it("applyTheme", () => {
    const dom = createDOM();
    const io = applyTheme(dom, "dark");
    expect(typeof io.unsafePerformIO).toBe("function");
    expect(dom.getAttribute("body", "data-theme")).toBeNull();
    expect(io.unsafePerformIO()).toBe("dark");
    expect(dom.getAttribute("body", "data-theme")).toBe("dark");
  });

  it("loadAndApplyTheme", () => {
    const d1 = createDOM();
    const io1 = loadAndApplyTheme(createStorage({ config: '{"theme":"dark","lang":"ru"}' }), d1);
    expect(typeof io1.unsafePerformIO).toBe("function");
    expect(d1.getAttribute("body", "data-theme")).toBeNull();
    expect(io1.unsafePerformIO()).toBe("Тема применена: dark");
    expect(d1.getAttribute("body", "data-theme")).toBe("dark");

    const d2 = createDOM();
    expect(loadAndApplyTheme(createStorage({ config: '{"theme":"light"}' }), d2).unsafePerformIO()).toBe("Тема применена: light");
    expect(d2.getAttribute("body", "data-theme")).toBe("light");

    const d3 = createDOM();
    expect(loadAndApplyTheme(createStorage({}), d3).unsafePerformIO()).toBe("Ошибка: Конфиг не найден");
    expect(d3.getAttribute("body", "data-theme")).toBeNull();

    expect(
      loadAndApplyTheme(createStorage({ config: "не json" }), createDOM()).unsafePerformIO().startsWith("Ошибка: Некорректный JSON"),
    ).toBe(true);
    expect(loadAndApplyTheme(createStorage({ config: '{"lang":"ru"}' }), createDOM()).unsafePerformIO()).toBe(
      "Ошибка: Тема не указана в конфиге",
    );
    expect(
      loadAndApplyTheme(createStorage({ config: '{"theme":"purple"}' }), createDOM())
        .unsafePerformIO()
        .startsWith("Ошибка: Недопустимая тема"),
    ).toBe(true);
  });
});
