Прочесть:
https://habr.com/ru/articles/665276/
https://hwisnu.bearblog.dev/array-of-structs-and-struct-of-arrays/
https://habr.com/ru/companies/yandex/articles/762678/

Посмотреть:
https://www.youtube.com/watch?v=IroPQ150F6c

Сделать:

1. https://github.com/rogerok/back-to-base/blob/main/2.oop-structures/practice/css-in-js/eval.ts сделать не RPN, а AST и вычилять по AST
2. сделать TODO app на fasitfy: GET /todos - все тудушки, GET /todos/:id - по айди одно, POST /todos - создание, DELETE /todos/:id, PATCH /todos - обновление тудушки. хранить в памяти, иметь сваггер доку через @fastify/swagger-ui + @fastify/swagger + регистрировать плагины и роутер через @fastify/autoload
3. роутер доделать
4. Написать ECS библиотеку (должен быть API как в https://github.com/Trixt0r/ecsts/blob/master/examples/rectangles/src/index.ts)
5. Задачка на fetch - fetchWithCache([url]). Использовать наш LRUCache.
   Принимает массив урлов, делает запрос параллельно. Делаем запрос, если есть ответ в кэше - возвращаем результат из него. Нужно предусмотреть retry, если запрос не удался. Отменить все запросы если прошло больше 10 секунд или вернулась ошибка (400е статусы), а 500 - можно ретратить, но с Exponential back-off retry + jitter(random). (AbortContoller)

Курс:
https://ru.hexlet.io/courses/js-asynchronous-programming/lessons/init/theory_unit + испытания:
Waterfall
Промисификация
Промисы: thenable и static
Промисы: event loop
Промисы: then
Промисы: catch
Промисы: reject

2. пример как регать роуты в фастифае

```ts
async function loadRoutes(
  fastify: FastifyInstance,
  options: Pick<CreateServerOptions, "ignoreRoutesPattern"> = {},
) {
  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, "../modules"),
    dirNameRoutePrefix: false,
    ignorePattern: options.ignoreRoutesPattern,
    options: {
      prefix: "api",
    },
    matchFilter: (path: string) =>
      [".route.ts", ".route.js"].some((postfix) => path.endsWith(postfix)),
  });
}
```

Почему и как оно работает. Ответить:

```ts
const test = async () => await test();

const test1 = async () => Promise.resove(0).then(test1);

const test2 = () => setTimeout(test2);
```
