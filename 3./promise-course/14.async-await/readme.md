Теория: Async и Await
Несмотря на все удобства, промисы не являются вершиной эволюции. Вспомним минусы, которые они добавляют:

Своя собственная обработка ошибок, которая идёт в обход try/catch. Это значит, что в коде будут появляться оба способа обработки, комбинирующихся в причудливых формах
Иногда бывает нужно передавать данные вниз по цепочке с самых верхних уровней, и с промисами делать это неудобно. Придётся создавать переменные вне промиса
С промисами по-прежнему легко начать создавать вложенность, если специально за этим не следить
Все эти сложности убираются механизмом async/await, делающим код с промисами еще более похожим на синхронный! Вспомним нашу задачу по объединению двух файлов. Вот её код:

```ts
import fsp from "fs/promises";

const unionFiles = (inputPath1, inputPath2, outputPath) => {
  let data1;
  return fsp
    .readFile(inputPath1, "utf-8")
    .then((content) => {
      data1 = content;
    })
    .then(() => fsp.readFile(inputPath2, "utf-8"))
    .then((data2) => fsp.writeFile(outputPath, `${data1}${data2}`));
};
```

А теперь посмотрим на этот же код с использованием async/await. Подчеркну, что async/await работает с промисами:

```ts
import fsp from "fs/promises";

const unionFiles = async (inputPath1, inputPath2, outputPath) => {
  // Очень важный момент. Так же как и в примере выше,
  // эти запросы выполняются строго друг за другом
  // (хотя при этом не блокируется программа, это значит,
  // что другой код тоже может выполняться во время этих запросов)
  const data1 = await fsp.readFile(inputPath1, "utf-8");
  const data2 = await fsp.readFile(inputPath2, "utf-8");
  await fsp.writeFile(outputPath, `${data1}${data2}`);
};
```

Эта версия визуально практически не отличается от её синхронной версии. Код настолько простой, что даже не верится, что он асинхронный. Разберём его по порядку.

Первое, что мы видим, — это ключевое слово async перед определением функции. Оно означает, что данная функция всегда возвращает промис: const promise = unionFiles(...). Причём теперь не обязательно возвращать результат из этой функции явно, он всё равно станет промисом.

Внутри функции используется ключевое слово await, которое ставится перед вызовом функций, которые, в свою очередь, тоже возвращают промисы. Если результат этого вызова присваивается переменной или константе, то в них записывается результат вызова. Если присвоения нет, как в последнем вызове await, то происходит ожидание выполнения операции без использования её результата.

Асинхронность в данном случае (как и в промисах) гарантирует нам, что программа не блокируется в ожидании завершения вызовов, она может продолжать делать что-то еще (но не в этой функции). Но она не гарантирует параллельности. Более того, подряд идущие await в рамках одной функции всегда выполняются строго друг за другом. Проще всего это понимать, если представлять код как цепочку промисов, где каждая следующая операция выполняется внутри then.

А что с обработкой ошибок? Теперь достаточно поставить обычные try/catch и ошибки будут отловлены!

```ts
import fsp from "fs/promises";

const unionFiles = async (inputPath1, inputPath2, outputPath) => {
  try {
    const data1 = await fsp.readFile(inputPath1, "utf-8");
    const data2 = await fsp.readFile(inputPath2, "utf-8");
    await fsp.writeFile(outputPath, `${data1}${data2}`);
  } catch (e) {
    console.log(e);
    throw e; // снова бросаем,
    // потому что вызывающий код должен иметь возможность отловить ошибку
  }
};
```

Однако, при параллельном выполнении промисов не обойтись без функции Promise.all:

```ts
const unionFiles = async (inputPath1, inputPath2, outputPath) => {
  // Эти вызовы начинают чтение почти одновременно и не ждут друг друга
  const promise1 = fsp.readFile(inputPath1, "utf-8");
  const promise2 = fsp.readFile(inputPath2, "utf-8");
  // Теперь дожидаемся, когда они оба завершатся
  // Данные можно сразу разложить
  const [data1, data2] = await Promise.all([promise1, promise2]);
  await fsp.writeFile(outputPath, `${data1}${data2}`);
};
```

Подводя итог, механизм async/await делает код максимально плоским и похожим на синхронный. Благодаря ему появляется возможность использовать try/catch, и легко манипулировать данными полученными в результате асинхронных операций.

```ts
// Код на колбеках
import fs from "fs";

fs.readFile("./first", "utf-8", (error1, data1) => {
  if (error1) {
    console.log("boom!");
    return;
  }
  fs.readFile("./second", "utf-8", (error2, data2) => {
    if (error2) {
      console.log("boom!");
      return;
    }
    fs.writeFile("./new-file", `${data1}${data2}`, (error3) => {
      if (error3) {
        console.log("boom!");
      }
    });
  });
});

// Код на промисах
import fsp from "fs/promises";

let data1;
fsp
  .readFile("./first", "utf-8")
  .then((d1) => {
    data1 = d1;
    return fsp.readFile("./second", "utf-8");
  })
  .then((data2) => fsp.writeFile("./new-file", `${data1}${data2}`))
  .catch(() => console.log("boom!"));

// Код на async/await
import fsp from "fs/promises";

// В реальной жизни чтение файлов лучше выполнять параллельно,
// как в функции unionFiles выше
const data1 = await fsp.readFile("./first", "utf-8");
const data2 = await fsp.readFile("./second", "utf-8");
await fsp.writeFile("./new-file", `${data1}${data2}`);
```

Механизм async/await не отменяет промисы. Он лишь дает удобный интерфейс над промисами, являясь по сути синтаксическим сахаром. Внутри его основы лежат все те же промисы.

```ts
useEffect(() => {
  let mounted = true;
  async function loadBadwords() {
    try {
      const enData = await import("bad-words-next/lib/en");
      const ruData = await import("bad-words-next/lib/ru");
      const rlData = await import("bad-words-next/lib/ru_lat");

      if (mounted) {
        badwordsRef.current.add(enData.default || enData);
        badwordsRef.current.add(ruData.default || ruData);
        badwordsRef.current.add(rlData.default || rlData);
        setBadwordsReady(true);
      }
    } catch (error) {
      console.error("Error loading bad words dictionaries:", error);
    }
  }

  loadBadwords();

  return () => {
    mounted = false;
  };
}, []);
```
