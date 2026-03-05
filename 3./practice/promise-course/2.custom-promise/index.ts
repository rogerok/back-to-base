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

export class CustomPromise<T = any> {
  promiseFulfillReactions: Resolve<T>[] = [];
  promiseRejectReactions: Reject[] = [];

  result: Result<T> = {
    state: "pending",
    value: undefined,
  };

  constructor(executor?: (resolve: Resolve, reject: Reject) => void) {
    if (typeof executor !== "function") {
      throw new TypeError("Executor must be a function");
    }

    executor(this.resolve, this.reject);
  }

  static resolve<T>(value: T) {
    if (value && typeof value === "object" && "then" in value && typeof value.then === "function") {
      return new CustomPromise((resolve, reject) => {
        // @ts-ignore
        try {
          value.then(resolve, reject);
        } catch (error) {
          reject(error);
        }
      });
    }

    return new CustomPromise((resolve) => {
      resolve(value);
    });
  }

  static reject<T>(reason: T) {
    return new CustomPromise((_, reject) => {
      reject(reason);
    });
  }

  resolve = (v: T) => {
    if (this.result.state === "pending") {
      this.result = {
        state: "fulfilled",
        value: v,
      };

      this.promiseFulfillReactions.forEach((cb) => {
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

      this.promiseRejectReactions.forEach((cb) => {
        setTimeout(cb, 0, v);
      });
    }
  };

  then = (
    resolve: (v: T) => T = (v) => v,
    reject: (v: any) => any = (v) => {
      throw v;
    },
  ) => {
    return new CustomPromise((res, rej) => {
      const fullfillCb = (v: T) => {
        try {
          res(resolve(v));
        } catch (err) {
          rej(err);
        }
      };

      const rejectCb = (v: any) => {
        try {
          res(reject(v));
        } catch (err) {
          rej(err);
        }
      };

      if (this.result.state === "fulfilled") {
        setTimeout(fullfillCb, 0, this.result.value);
      }

      if (this.result.state === "rejected") {
        setTimeout(rejectCb, 0, this.result.value);
      }

      if (this.result.state === "pending") {
        this.promiseRejectReactions.push(rejectCb);
        this.promiseFulfillReactions.push(fullfillCb);
      }
    });
  };

  catch = (reject: Reject<T>) => this.then(undefined, reject);
}

const p = new CustomPromise((resolve) => {
  resolve("hello");
});
p.then((v) => v + " world").then((v) => v.toUpperCase());

Promise;
