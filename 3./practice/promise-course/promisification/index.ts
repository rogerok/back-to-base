export const promisify = <A extends unknown[] = unknown[], T, R = void>(
  cb: (...args: [...A, (err: any, data?: T) => R]) => R,
) => {
  return (...args: A) => {
    return new Promise<T>((resolve, reject) => {
      const f = (err: any, data?: T): void => {
        if (err) {
          reject(err instanceof Error ? err : new Error(String(err)));
        } else {
          resolve(data as T);
        }
      };

      cb(...([...args, f] as Parameters<typeof cb>));
    });
  };
};
