import { match } from "ts-pattern";

type Resolve<T = any> = (v: T) => void;
type Reject<T = any> = (v: T) => void;

type State = "fulfilled" | "pending" | "rejected";

interface BaseResult {
  state: State;
}

interface ResultRejected extends BaseResult {
  state: "rejected";
  value: any;
}

interface ResultFulfilled<T> extends BaseResult {
  state: "fulfilled";
  value: T;
}

interface ResultPending extends BaseResult {
  state: "pending";
  value: undefined;
}

type Result<T> = ResultFulfilled<T> | ResultPending | ResultRejected;

export class CustomPromise<T> {
  result: Result<T> = {
    state: "pending",
    value: undefined,
  };

  resolveReactions: ((v: T) => void)[] = [];
  rejectReactions: ((v: any) => void)[] = [];

  constructor(executor?: (resolve: Resolve, reject: Reject) => void) {
    if (typeof executor !== "function") {
      throw new TypeError("Executor must be a function");
    }
    executor(this.resolve, this.reject);
  }

  static resolve<V>(v: V) {
    if (v && typeof v === "object" && "then" in v && typeof v.then === "function") {
      return new CustomPromise<V>((resolve, reject) => {
        try {
          const fn = v.then as (res: Resolve<V>, reject: Reject) => void;
          fn(resolve, reject);
        } catch (e) {
          reject(e);
        }
      });
    }

    return new CustomPromise<V>((resolve) => {
      resolve(v);
    });
  }

  static reject<V = any>(v: V): CustomPromise<V> {
    return new CustomPromise<V>((_, reject) => {
      reject(v);
    });
  }

  resolve = (v: T): void => {
    if (this.result.state === "pending") {
      this.result = {
        state: "fulfilled",
        value: v,
      };

      if (this.resolveReactions.length) {
        this.resolveReactions.forEach((cb) => {
          setTimeout(cb, 0, v);
        });
      }

      this.resolveReactions = [];
      this.rejectReactions = [];
    }
  };

  reject = (v: any): void => {
    if (this.result.state === "pending") {
      this.result = {
        state: "rejected",
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        value: v,
      };

      if (this.rejectReactions.length) {
        this.rejectReactions.forEach((cb) => {
          setTimeout(cb, 0, v);
        });
      }

      this.resolveReactions = [];
      this.rejectReactions = [];
    }
  };

  then = <V>(
    onFulfill: (v: T) => V = ((v: T) => v) as unknown as (v: T) => V,
    onReject: (v: any) => any = (v) => {
      throw v;
    },
  ): CustomPromise<V> => {
    return new CustomPromise<V>((resolve, reject) => {
      const fullfillCb = (v: T) => {
        try {
          resolve(onFulfill(v));
        } catch (err) {
          reject(err);
        }
      };

      const rejectCb = (v: any) => {
        try {
          resolve(onReject(v));
        } catch (err) {
          reject(err);
        }
      };

      match<Result<T>>(this.result)
        .with({ state: "fulfilled" }, ({ value }) => setTimeout(fullfillCb, 0, value))
        .with({ state: "rejected" }, ({ value }) => setTimeout(rejectCb, 0, value))
        .otherwise(() => {
          this.rejectReactions.push(rejectCb);
          this.resolveReactions.push(fullfillCb);
        });
    });
  };

  catch = (reject: Reject) => this.then(undefined, reject);
}
