import { describe, expect, it } from "vitest";

import { bind, fetchProgram, fetchUrl, runIO, writeLine } from "../index";

describe("Task 06: fetch instruction", () => {
  it("fetchUrl delegates fetching to the world and passes the response body onward", async () => {
    const fetched: string[] = [];
    const output: string[] = [];
    const program = bind(fetchUrl("https://example.test/data"), (body) =>
      writeLine(`body:${body}`),
    );

    await runIO(program, {
      fetch: async (url) => {
        fetched.push(url);
        return "payload";
      },
      readLine: async () => {
        throw new Error("readLine should not be used");
      },
      writeLine: async (line) => {
        output.push(line);
      },
    });

    expect(fetched).toEqual(["https://example.test/data"]);
    expect(output).toEqual(["body:payload"]);
  });

  it("fetchProgram describes the required output sequence", async () => {
    const output: string[] = [];

    await runIO(fetchProgram, {
      fetch: async () => "hello",
      readLine: async () => {
        throw new Error("readLine should not be used");
      },
      writeLine: async (line) => {
        output.push(line);
      },
    });

    expect(output).toEqual(["Fetching data...", "Got 5 chars"]);
  });
});
