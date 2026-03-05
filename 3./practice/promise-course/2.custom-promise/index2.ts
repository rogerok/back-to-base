import { CustomPromise } from "./index.ts";

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

export class CustomPromise2<T> {
  result: Result<T> = {
    state: "pending",
    value: undefined,
  };

  rejectReactions: Reject[] = [];
  resolveReactions: Resolve<T>[] = [];

  constructor(executor?: (resolve: Resolve, reject: Reject) => void) {
    if (typeof executor !== "function") {
      throw new TypeError("Executor must be a function");
    }
  }

  static resolve<V>(v: V) {
    if (v && typeof v === "object" && "then" in v && typeof v.then === "function") {
      return new CustomPromise2<V>((resolve, reject) => {
        try {
          const fn = v.then as (res: Resolve<V>, reject: Reject) => void;
          fn(resolve, reject);
        } catch (e) {
          reject(e);
        }
      });
    }

    return new CustomPromise2((resolve) => {
      resolve(v);
    });
  }

  static reject(v: any) {
    return new CustomPromise((_, reject) => {
      reject(v);
    });
  }

  resolve = (v: T) => {
    if (this.result.state === "pending") {
      this.result = {
        state: "fulfilled",
        value: v,
      };

      this.resolveReactions.forEach((cb) => {
        setTimeout(cb, 0, v);
      });
    }
  };

  reject = (v: any) => {
    if (this.result.state === "pending") {
      this.result = {
        state: "rejected",
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        value: v,
      };
    }

    this.rejectReactions.forEach((cb) => {
      setTimeout(cb, 0, v);
    });
  };

  then = (
    onFulfill: (v: T) => T = (v) => v,
    onReject: (v: any) => any = (v) => {
      throw v;
    },
  ) => {
    return new CustomPromise2((resolve, reject) => {
      if (this.result.state === "fulfilled") {
        const cb = (v: T) => {
          try {
            resolve(onFulfill(v));
          } catch (err) {
            reject(err);
          }
        };

        cb(this.result.value);
      }

      if (this.result.state === "rejected") {
        const cb = (v: any) => {
          try {
            resolve(onReject(v));
          } catch (err) {
            reject(err);
          }
        };

        cb(this.result.value);
      }

      if (this.result.state === "pending") {
        this.rejectReactions.push(onReject);
        this.resolveReactions.push(onFulfill);
      }
    });
  };
}

const messages = [];

const resolvedPromise = new CustomPromise((resolve) => {
  resolve("Сначала резолвим?");
});

const modifiedPromise = resolvedPromise.then((v) => {
  messages.push("Сначала меняем статус.");
});

await modifiedPromise.then(() => {
  messages.push("А уже потом резолвим.");
});
console.log(resolvedPromise);
