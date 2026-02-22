Теория: Упорядочивание асинхронных операций

Асинхронное программирование помогает эффективно использовать вычислительные ресурсы. Но создает сложности там, где изначально было просто. В первую очередь это касается порядка выполнения (flow). Предположим, что перед нами стоит задача прочитать содержимое двух файлов и записать в третий (объединение файлов).

```ts
import fs from "fs";

fs.readFile("./first", "utf-8", "?");
fs.readFile("./second", "utf-8", "?");
fs.writeFile("./new-file", content, "?");
```

Вся задача сводится к последовательному выполнению трёх операций, так как записать новый файл мы можем лишь тогда, когда прочитаем данные первых двух. Упорядочить подобный код можно лишь одним способом: каждая последующая операция должна запускаться внутри колбека предыдущей. Тогда мы построим нужную цепочку вызовов:

```ts
import fs from "fs";

fs.readFile("./first", "utf-8", (_error1, data1) => {
  fs.readFile("./second", "utf-8", (_error2, data2) => {
    fs.writeFile("./new-file", `${data1}${data2}`, (_error3) => {
      console.log("File has been written");
    });
  });
});
```

В реальных программах количество операций может быть значительно больше: например, десятки — и тогда у вас получится лесенка из 10-и вложенных вызовов. Подобное свойство асинхронного кода нередко называют Callback Hell («ад колбеков») из-за большого числа вложенных колбеков, которые очень затрудняют анализ программы. Кто-то даже сделал сайт http://callbackhell.com/, на котором разбирается эта проблема и приводится вот такой код:

```ts
import fs from 'fs';

// В этом коде происходит обработка ошибок, которую мы рассмотрим в следующем уроке
fs.readdir(source, (err, files) => {
  if (err) {
    console.log('Error finding files: ' + err)
  } else {
    files.forEach((filename, fileIndex) => {
      console.log(filename)
      gm(source + filename).size((err, values) => {
        if (err) {
          console.log('Error identifying file size: ' + err)
        } else {
          console.log(filename + ' : ' + values)
          aspect = (values.width / values.height)
          widths.forEach((width, widthIndex) => {
            height = Math.round(width / aspect)
            console.log('resizing ' + filename + 'to ' + height + 'x' + height)
            this.resize(width, height).write(dest + 'w' + width + '_' + filename, (err) => {
              if (err) console.log('Error writing file: ' + err)
            })
          }.bind(this))
        }
      })
    })
  }
})
```

В некоторых случаях заранее неизвестно, сколько надо будет выполнить операций. Например, может понадобиться прочитать содержимое директории и посмотреть, кто владелец каждого файла (его uid). Если бы код был синхронный, то наше решение выглядело бы так:

```ts
import path from "path";
import fs from "fs";

const getFileOwners = (dirpath) => {
  // Читаем содержимое директории
  const files = fs.readdirSync(dirpath);
  // Получаем информацию по каждому файлу и формируем результат
  return files
    .map((fname) => [fname, fs.statSync(path.join(dirpath, fname))])
    .map(([fname, stat]) => ({ filename: fname, owner: stat.uid }));
};
// [ { filename: 'Makefile', owner: 65534 },
//       { filename: '__tests__', owner: 65534 },
//       { filename: 'babel.config.js', owner: 65534 },
//       { filename: 'info.js', owner: 65534 },
//       { filename: 'package.json', owner: 65534 } ]
```

Последовательный код прост и понятен, каждая следующая строчка выполняется после того, как закончится предыдущая, а в map каждый элемент обрабатывается гарантированно последовательно.

С асинхронным кодом возникают вопросы. И если чтение директории — операция, которую мы сделаем в любом случае, то как описать анализ файлов, ведь их может быть любое количество. К сожалению, без использования готовых абстракций, упрощающих данную задачу, мы получим много сложного кода. Настолько сложного, что в реальной жизни так лучше никогда не делать, этот код приводится только в образовательных целях.

```ts
import path from "path";
import fs from "fs";

const getFileOwners = (dirpath, cb) => {
  fs.readdir(dirpath, (_error1, filenames) => {
    const readFileStat = (items, result = []) => {
      if (items.length === 0) {
        // Обработку ошибок пока не рассматриваем
        cb(null, result);
        return;
      }
      const [first, ...rest] = items;
      const filepath = path.join(dirpath, first);
      fs.stat(filepath, (_error2, stat) => {
        readFileStat(rest, [...result, { filename: first, owner: stat.uid }]);
      });
    };
    readFileStat(filenames);
  });
};
```

Общий принцип такой: формируется специальная функция (readFileStat), которая рекурсивно вызывается, передавая себя в функцию stat. С каждым новым вызовом она отрабатывает один файл и уменьшает массив items, в котором содержатся еще необработанные файлы. Вторым параметром она аккумулирует (собирает) получившийся результат, который в конце передаётся в колбек cb (переданный вторым аргументом функции getFileOwners). Пример выше реализует итеративный процесс, построенный на рекурсивных функциях. Чтобы лучше понять код выше, попробуйте скопировать его к себе на компьютер и позапускайте с разными аргументами, предварительно расставив отладочный вывод внутри неё.
