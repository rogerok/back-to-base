import {
  getHost,
  getPath,
  getProtocol,
  getQueryParam,
  make,
  setHost,
  setPath,
  setProtocol,
  setQueryParam,
  toString,
} from "./index.ts";

describe("url abstraction – behavior tests", () => {
  it("creates url and preserves original string", () => {
    const raw = "https://hexlet.io/community?q=low";
    const url = make(raw);

    expect(toString(url)).toBe(raw);
  });

  it("reads url parts correctly", () => {
    const url = make("http://hexlet.io:8080/community?q=low");

    expect(getProtocol(url)).toBe("http:");
    expect(getHost(url)).toBe("hexlet.io:8080");
    expect(getPath(url)).toBe("/community");
  });

  it("does not mutate original url when protocol changes", () => {
    const url = make("http://hexlet.io/community?q=low");
    const updated = setProtocol(url, "https:");

    expect(toString(url)).toBe("http://hexlet.io/community?q=low");
    expect(toString(updated)).toBe("https://hexlet.io/community?q=low");
  });

  it("does not mutate original url when host changes", () => {
    const url = make("https://hexlet.io/community?q=high");
    const updated = setHost(url, "code-basics.com");

    expect(toString(url)).toBe("https://hexlet.io/community?q=high");
    expect(toString(updated)).toBe("https://code-basics.com/community?q=high");
  });

  it("does not mutate original url when path changes", () => {
    const url = make("https://hexlet.io/community?q=low");
    const updated = setPath(url, "/404");

    expect(toString(url)).toBe("https://hexlet.io/community?q=low");
    expect(toString(updated)).toBe("https://hexlet.io/404?q=low");
  });

  it("sets new query parameter", () => {
    const url = make("https://hexlet.io/community?q=low");
    const updated = setQueryParam(url, "page", "5");

    expect(toString(updated)).toBe("https://hexlet.io/community?q=low&page=5");
  });

  it("updates existing query parameter", () => {
    const url = make("https://hexlet.io/community?q=low&page=1");
    const updated = setQueryParam(url, "q", "high");

    expect(toString(updated)).toBe("https://hexlet.io/community?q=high&page=1");
  });

  it("getQueryParam returns value or default", () => {
    const url = make("https://hexlet.io/community?q=low");

    expect(getQueryParam(url, "q")).toBe("low");
    expect(getQueryParam(url, "page")).toBeNull();
    expect(getQueryParam(url, "page", "1")).toBe("1");
  });

  it("handles urls without query params", () => {
    const url = make("https://hexlet.io/community");

    expect(toString(url)).toBe("https://hexlet.io/community");
    expect(getQueryParam(url, "q")).toBeNull();
  });

  it("allows chaining without shared state", () => {
    const url = make("https://hexlet.io/community?q=low");

    const u1 = setProtocol(url, "http:");
    const u2 = setPath(u1, "/404");
    const u3 = setQueryParam(u2, "page", "5");

    expect(toString(url)).toBe("https://hexlet.io/community?q=low");
    expect(toString(u3)).toBe("http://hexlet.io/404?q=low&page=5");
  });
});
