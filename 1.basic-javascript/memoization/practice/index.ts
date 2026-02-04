type Callback<Args, Return> = (...args: Args[]) => Return;

export function memoize<Args, Return>(cb: Callback<Args, Return>): Callback<Args, Return> {
  const cache: Record<string, Return | null> = {};

  const wrapper: Callback<Args, Return> | null = (...args: Args[]): Return => {
    const argKeys = String(args);
    if (argKeys in cache && cache[argKeys]) {
      return cache[argKeys];
    } else {
      const callResult = cb(...args);
      cache[argKeys] = callResult;
      return callResult;
    }
  };

  return wrapper;
}

function generateBigObject(id: number) {
  console.log(`⚠️ Пересчет для ID: ${id}`);

  const data: Record<string, any> = { id: id };

  for (let i = 0; i < 100; i++) {
    const key = `level_${i}`;
    data[key] = {
      arr: new Array(1000).fill(`item_${id}_${i}`),
      index: i,
      nested: {
        info: `Some string data for object ${id}`,
        value: Math.random(),
      },
    };
  }

  return data;
}

const calc = (num: number) => {
  console.log("was called");
  return num + num;
};

const fn = memoize(calc);
const obj = memoize(generateBigObject);

obj(1);
obj(2);
obj(3);
obj(4);
obj(5);
obj(6);
obj(7);
obj(8);
obj(9);
obj(10);
obj(11);
obj(12);
obj(13);
obj(14);
obj(15);
obj(16);
obj(1);
obj(2);
obj(3);
obj(4);
obj(5);
obj(6);
obj(7);
obj(8);
obj(9);
obj(10);
obj(11);
obj(12);
obj(13);
obj(14);
obj(15);
obj(16);
obj(1);

obj(2);
obj(3);
obj(4);
obj(5);
obj(6);
obj(7);
obj(8);
obj(9);
obj(10);
obj(11);
obj(12);
obj(13);
obj(14);
obj(15);
obj(16);
obj(1);
obj(2);
obj(3);
obj(4);
obj(5);
obj(6);
obj(7);
obj(8);
obj(9);
obj(10);
obj(11);
obj(12);
obj(13);
obj(14);
obj(15);
obj(16);
obj(1);
obj(2);
obj(3);
obj(4);
obj(5);
obj(6);
obj(7);
obj(8);
obj(9);
obj(10);
obj(11);
obj(12);
obj(13);
obj(14);
obj(15);
obj(16);
obj(1);
obj(2);
obj(3);
obj(4);
obj(5);
obj(6);
obj(7);
obj(8);
obj(9);
obj(10);
obj(11);
obj(12);
obj(13);
obj(14);
obj(15);
obj(16);
obj(1);
obj(2);
obj(3);
obj(4);
obj(5);
obj(6);
obj(7);
obj(8);
obj(9);
obj(10);
obj(11);
obj(12);
obj(13);
obj(14);
obj(15);
obj(16);
obj(1);
obj(2);
obj(3);
obj(4);
obj(5);
obj(6);
obj(7);
obj(8);
obj(9);
obj(10);
obj(11);
obj(12);
obj(13);
obj(14);
obj(15);
obj(16);
obj(1);
obj(2);
obj(3);
obj(4);
obj(5);
obj(6);
obj(7);
obj(8);
obj(9);
obj(10);
obj(11);
obj(12);
obj(13);
obj(14);
obj(15);
obj(16);
