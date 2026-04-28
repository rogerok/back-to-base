import { describe, expect, it } from "vitest";

import { myProgram, runIO, testWorld } from "../index";

describe("Task 05: test world", () => {
  it("runs myProgram against mocked input and captures output", async () => {
    const world = testWorld(["Alice", "30"]);

    await runIO(myProgram, world);

    expect(world.output).toEqual([
      "What is your name?",
      "Hello, Alice! How old are you?",
      "Wow, Alice, 30 is a great age!",
    ]);
  });

  it("fails loudly when the program reads more input than the test supplied", async () => {
    const world = testWorld([]);

    await expect(Promise.resolve().then(() => world.readLine())).rejects.toThrow();
  });
});
