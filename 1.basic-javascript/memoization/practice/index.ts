type Callback<Args, Return> = (...args: Args[]) => Return;

export function memoize<Args, Return>(cb: Callback<Args, Return>): Callback<Args, Return> {
  const result: Record<string, Return> = {};

  const func = function wrapper(...args: Args[]): Return {
    const argKeys = JSON.stringify(args);
    if (argKeys in result) {
      return result[argKeys];
    } else {
      const callResult = cb(...args);
      result[argKeys] = callResult;
      return callResult;
    }
  };

  return func;
}

const calc = (num: number) => {
  console.log("was called");
  return num + num;
};

const fn = memoize(calc);

fn(3, 2);
fn(2, 2);
fn(2, 2);
fn(2, 2);
fn(2, 2);
fn(2, 2);
fn(2, 2);
fn(2, 2);
