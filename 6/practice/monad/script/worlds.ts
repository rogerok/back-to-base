export interface World {
  fetch: (url: string, options?: RequestInit) => Promise<string>;
  readLine: () => Promise<string>;
  writeLine: (s: string) => Promise<void>;
}

export const makeTestWorld = (
  input: string[],
  fetchMock: Record<string, string>,
): {
  output: string[];
} & World => {
  const output: string[] = [];
  const strs = [...input];

  return {
    //  eslint-disable-next-line @typescript-eslint/require-await
    fetch: async (url) => {
      if (!(url in fetchMock)) {
        throw new Error(`fetch to ${url} not mocked`);
      }

      return fetchMock[url];
    },
    output,
    //  eslint-disable-next-line @typescript-eslint/require-await
    readLine: async () => {
      const last = strs.shift();
      if (typeof last === "undefined") {
        throw new Error("Mock can't be empty");
      }
      return last;
    },
    //  eslint-disable-next-line @typescript-eslint/require-await
    writeLine: async (s: string) => {
      output.push(s);
    },
  };
};

export const loggingWorld = (inner: World): World => ({
  fetch: async (url, options) => {
    console.log("fetch url: ", url, "with options", options);
    return await inner.fetch(url, options);
  },
  readLine: async () => {
    const result = await inner.readLine();
    console.log("readline: ", result);
    return result;
  },
  writeLine: async (s: string) => {
    console.log("write line: ", s);
    await inner.writeLine(s);
  },
});
