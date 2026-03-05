import { promisify } from "./index.ts";

const double = (n: number, cb: (err: null, result: number) => void) => {
  cb(null, n * 2);
};

const fail = (cb: (err: Error) => void) => {
  cb(new Error("something went wrong"));
};

const concat = (a: string, b: string, cb: (err: null, result: string) => void) => {
  cb(null, a + b);
};

const delayedValue = (value: string, ms: number, cb: (err: null, result: string) => void) => {
  setTimeout(() => { cb(null, value); }, ms);
};

test("resolves with value from callback", async () => {
  const doubleAsync = promisify(double);
  const result = await doubleAsync(5);
  expect(result).toBe(10);
});

test("rejects with error from callback", async () => {
  const failAsync = promisify(fail);
  await expect(failAsync()).rejects.toThrow("something went wrong");
});

test("rejects with an instance of Error", async () => {
  const failAsync = promisify(fail);
  await expect(failAsync()).rejects.toBeInstanceOf(Error);
});

test("works with multiple arguments", async () => {
  const concatAsync = promisify(concat);
  const result = await concatAsync("hello", " world");
  expect(result).toBe("hello world");
});

test("works asynchronously", async () => {
  const delayedAsync = promisify(delayedValue);
  const result = await delayedAsync("async result", 50);
  expect(result).toBe("async result");
});

test("returns a Promise", () => {
  const doubleAsync = promisify(double);
  expect(doubleAsync(1)).toBeInstanceOf(Promise);
});
