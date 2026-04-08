import { describe, expect, it } from "vitest";

import { buildGreeting, copyAndTransform, createDOM, createStorage, readStorage, toUpperCaseIO, writeDOM } from "./exercise-4.ts";

describe("exercise-4.ts", () => {
  it("readStorage и writeDOM", () => {
    const storage = createStorage({ name: "Иван", count: "42" });
    const dom = createDOM();

    const ioName = readStorage(storage, "name");
    expect(typeof ioName.unsafePerformIO).toBe("function");
    expect(ioName.unsafePerformIO()).toBe("Иван");
    expect(readStorage(storage, "count").unsafePerformIO()).toBe("42");
    expect(readStorage(storage, "missing").unsafePerformIO()).toBeNull();

    const ioWrite = writeDOM(dom, "title", "Привет");
    expect(dom.getValue("title")).toBeNull();
    expect(ioWrite.unsafePerformIO()).toBe("Привет");
    expect(dom.getValue("title")).toBe("Привет");
  });

  it("toUpperCaseIO", () => {
    expect(toUpperCaseIO(readStorage(createStorage({ greeting: "привет" }), "greeting")).unsafePerformIO()).toBe("ПРИВЕТ");
    expect(toUpperCaseIO(readStorage(createStorage({ word: "hello world" }), "word")).unsafePerformIO()).toBe("HELLO WORLD");
  });

  it("copyAndTransform", () => {
    const storage = createStorage({ count: "5", price: "100" });
    const dom = createDOM();

    const ioDouble = copyAndTransform(storage, dom, "count", "result", (n) => String(Number(n) * 2));
    expect(typeof ioDouble.unsafePerformIO).toBe("function");
    expect(dom.getValue("result")).toBeNull();
    ioDouble.unsafePerformIO();
    expect(dom.getValue("result")).toBe("10");

    copyAndTransform(storage, dom, "price", "discounted", (p) => String(Number(p) * 0.9)).unsafePerformIO();
    expect(dom.getValue("discounted")).toBe("90");

    copyAndTransform(storage, dom, "missing", "output", (v) => `[${v}]`).unsafePerformIO();
    expect(dom.getValue("output")).toBe("[null]");
  });

  it("buildGreeting", () => {
    const storage = createStorage({ firstName: "Иван", lastName: "Петров" });
    const dom = createDOM();

    const io = buildGreeting(storage, dom);
    expect(typeof io.unsafePerformIO).toBe("function");
    expect(dom.getValue("greeting")).toBeNull();
    io.unsafePerformIO();
    expect(dom.getValue("greeting")).toBe("Добро пожаловать, Иван Петров!");

    const dom2 = createDOM();
    buildGreeting(createStorage({ firstName: "Мария", lastName: "Иванова" }), dom2).unsafePerformIO();
    expect(dom2.getValue("greeting")).toBe("Добро пожаловать, Мария Иванова!");
  });
});
