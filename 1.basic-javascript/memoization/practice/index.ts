type Callback<T> = (...args: T[]) => T;
let cache: unknown = null;
let callback: Callback<any> | null = null;

export const memoize = <T>(cb: (...args: T[]) => T): T => {
  if (callback !== cb) {
    callback = null;
    cache = null;
    callback = cb as Callback<T>;
    cache = cb();
  }

  return cache as T;
};

const call = (): string => {
  console.log(" i am was called");
  return "1234";
};

const call2 = (): string => {
  console.log(" i am was called 2");
  return "1234";
};

memoize<string>(call);
memoize<string>(call);
memoize<string>(call2);
memoize<string>(call2);
memoize<string>(call2);
// memoize<string>(call2);
