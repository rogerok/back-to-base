import { bind, map, pure, readLine, andThen, writeLine } from "../index";

describe("Task 02: bind, map, and andThen", () => {
  it("bind substitutes a pure value into the continuation", () => {
    expect(bind(pure(2), (value) => pure(value + 3))).toEqual({
      tag: "pure",
      value: 5,
    });
  });

  it("bind preserves readLine and pushes the continuation behind the read result", () => {
    const program = bind(readLine, (name) => writeLine(`Hello, ${name}!`));

    expect(program.tag).toBe("readLine");

    if (program.tag !== "readLine") {
      throw new Error("Expected bind(readLine, ...) to stay readLine at the root");
    }

    expect(program.next("Alice")).toMatchObject({
      tag: "writeLine",
      text: "Hello, Alice!",
    });
  });

  it("bind preserves writeLine and attaches the continuation to its next program", () => {
    const program = bind(writeLine("first"), () => writeLine("second"));

    expect(program).toMatchObject({
      tag: "writeLine",
      text: "first",
    });

    if (program.tag !== "writeLine") {
      throw new Error("Expected bind(writeLine, ...) to stay writeLine at the root");
    }

    expect(program.next).toMatchObject({
      tag: "writeLine",
      text: "second",
    });
  });

  it("map transforms only the returned value", () => {
    expect(map(pure(10), (value) => value * 2)).toEqual({
      tag: "pure",
      value: 20,
    });
  });

  it("andThen discards the first result and runs the second program afterwards", () => {
    const program = andThen(writeLine("first"), writeLine("second"));

    expect(program).toMatchObject({
      tag: "writeLine",
      text: "first",
    });

    if (program.tag !== "writeLine") {
      throw new Error("Expected andThen(writeLine, ...) to start with the first program");
    }

    expect(program.next).toMatchObject({
      tag: "writeLine",
      text: "second",
    });
  });
});
