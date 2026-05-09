import { describe, expect, it } from "vitest";
import { bind, fetchUrl, pure, runIO, testWorld, writeLine } from "../../index";

describe("E7.1 — fetchUrl constructor", () => {
  it("fetchUrl returns a node with tag 'fetch'", () => {
    const node = fetchUrl("https://example.com");
    expect(node.tag).toBe("fetch");
  });

  it("stores the URL", () => {
    const node = fetchUrl("https://example.com/api");
    if (node.tag !== "fetch") throw new Error("expected fetch");
    expect(node.url).toBe("https://example.com/api");
  });

  it("next is a continuation (function)", () => {
    const node = fetchUrl("https://example.com");
    if (node.tag !== "fetch") throw new Error("expected fetch");
    expect(typeof node.next).toBe("function");
  });
});

describe("E7.1 — runIO handles fetch", () => {
  it("fetch result is passed to the continuation", async () => {
    const world = testWorld([], { "https://api.test/data": "response-body" });
    const program = bind(fetchUrl("https://api.test/data"), (body) => pure(body));
    const result = await runIO(program, world);
    expect(result).toBe("response-body");
  });

  it("fetch result can be written to output", async () => {
    const world = testWorld([], { "https://api.test/greet": "Hello from API" });
    const program = bind(fetchUrl("https://api.test/greet"), (body) =>
      writeLine(body),
    );
    await runIO(program, world);
    expect(world.output).toEqual(["Hello from API"]);
  });
});

describe("E7.2 — testWorld: fail loud on unmocked URL", () => {
  it("throws when URL is not mocked", async () => {
    const world = testWorld([], {});
    const program = fetchUrl("https://unmocked.test/endpoint");
    await expect(runIO(program, world)).rejects.toThrow(/unmocked\.test\/endpoint|not mocked/i);
  });

  it("succeeds when the URL is mocked", async () => {
    const url = "https://mocked.test/ok";
    const world = testWorld([], { [url]: "ok" });
    const result = await runIO(bind(fetchUrl(url), (b) => pure(b)), world);
    expect(result).toBe("ok");
  });
});

describe("E7.3 ★ — Sleep", () => {
  it("sleep node has tag 'sleep' and ms field", () => {
    // Import sleep if the student exported it
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("../../index") as Record<string, unknown>;
    if (!("sleep" in mod)) {
      // Not yet implemented — skip gracefully
      return;
    }
    const sleep = mod["sleep"] as (ms: number) => unknown;
    const node = sleep(100) as any;
    expect(node.tag).toBe("sleep");
    expect(node.ms).toBe(100);
  });
});
