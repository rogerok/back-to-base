import { Middleware, Next } from "./types";

export const compose = (middlewares: Middleware[]) => {
  return (ctx: Context, next: Next) => {
    let idx = -1;

    const dispatch = (i: number): Promise<void> => {
      if (i >= middlewares.length) {
        console.log("here");
        return Promise.resolve();
      }

      if (i <= idx) {
        return Promise.reject(new Error("next() called multiple times"));
      }
      idx = i;

      const fn = i < middlewares.length ? middlewares[i] : next;

      try {
        return Promise.resolve(fn(ctx, () => dispatch(i + 1)));
      } catch (e) {
        throw e;
      }
    };

    return dispatch(0);
  };
};
