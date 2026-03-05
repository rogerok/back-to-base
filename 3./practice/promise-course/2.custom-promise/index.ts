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

  rejectReactions: Reject[] = [];
  resolveReactions: Resolve<T>[] = [];

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

      this.rejectReactions.forEach((cb) => {
        setTimeout(cb, 0, v);
      });
    }
  };

  then = (
    onFulfill: (v: T) => T = (v) => v,
    onReject: (v: any) => any = (v) => {
      throw v;
    },
  ) => {
    return new CustomPromise((resolve, reject) => {
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

      if (this.result.state === "fulfilled") {
        setTimeout(fullfillCb, 0, this.result.value);
      }

      if (this.result.state === "rejected") {
        setTimeout(rejectCb, 0, this.result.value);
      }

      if (this.result.state === "pending") {
        this.rejectReactions.push(rejectCb);
        this.resolveReactions.push(fullfillCb);
      }
    });
  };

  catch = (reject: Reject) => this.then(undefined, reject);
}

const p = new CustomPromise<string>((resolve) => {
  resolve("hello");
});
p.then((v) => v + " world").then((v) => v.toUpperCase());
