# Tasks

1. Переделать Router:

```ts
interface Context {
 req: Request,
 res: Response,
}

// in db-middleware.d.ts begin
declare ... // через слияние интерфейс Context должен быть расширен
interface Context {
  dataSource: DbInstace
}
// in db-middleware.d.ts end

type Handler = (ctx: Context, next: Next) => void | ((ctx: Context) => Promise<void>);
export type Next = () => void | Promise<void>;

use(middleware: Middleware, opts?: UseOptions): Router

get(path: string, opts: RouteOptions, handler: Handler): Router
post(path: string, opts: RouteOptions, handler: Handler): Router
patch(path: string, opts: RouteOptions, handler: Handler): Router
delete(path: string, opts: RouteOptions, handler: Handler): Router

const router = new Router()
  .get("/", getHelloHandler)
  .use(loggerMiddleware) // срабатывает для всех вложенных тоже
  .nest("/api", (r) => r.get("/test").use(dbMiddleware)) // dbMiddleware срабатывает только для вложенных

router.prettyPrint()
// └── / — пример, не прям так
//     ├── test (GET)
//     │   ├── /hello (GET)
//     │   └── ing (GET)
//     │       └── /
//     │           └── :param (GET)
//     └── update (PUT)

```

Добавить валидацию с зод схемой. `res.status(200).send({}) `должен быть типизированным в зависимости от статуса.
Важно - все методы роутера могут быть выражены через use (по сути вызов метода-рутера - это отдельная мидлвара).
Сделать роутер "контекстным", те мидлвары срабатывают сверху вниз контекста.
Для внутренней реализации роутинга использовать https://en.wikipedia.org/wiki/Radix_tree (см https://github.com/delvedor/find-my-way/tree/main)

2. `memoize`: для мемоизации переделать на LRU cache + сделать wrapper.clear для отчистки кеша

3. `decode(val: string)` дописать через строку битовую

````ts
type Adenine = typeof NucleotideMap.Adenine;
type Cytosine = typeof NucleotideMap.Cytosine;
type Guanine = typeof NucleotideMap.Guanine;
type Thymine = typeof NucleotideMap.Thymine;

export type Nucleotide = Adenine | Cytosine | Guanine | Thymine;```
````

4. `tagged-templates` - добавить "оптимизирующий компилятор". когда внутри calc два значения одного типа `(px, rem, % и тп)` вычислять их сразу, тут может быть `calc(10px - 200px + 30px \* 10px)`
5. Найти и покрыть тестами 10 примеров, где typescript оказывается `unsound`

## Курсы:

https://ru.hexlet.io/courses/js-objects + испытания: Преобразование DNA в RNA, Сборщик строки запроса (+сделать вариант для сбора объектов и массивов в query string - изучить либы), Вычислитель отличий, Римские цифры
https://ru.hexlet.io/courses/js-data-abstraction + испытания: Онлайн-магазин, Обработка ссылок

https://ru.hexlet.io/courses/js-introduction-to-oop
https://ru.hexlet.io/courses/js-polymorphism
https://ru.hexlet.io/courses/js-classes

https://ru.hexlet.io/challenges/js_classes_booking_system_exercise
https://ru.hexlet.io/challenges/js_classes_logger_exercise

## Читать:

https://medium.com/devschacht/polymorphism-207d9f9cd78
https://medium.com/@rahul.jindal57/understanding-just-in-time-jit-compilation-in-v8-a-deep-dive-c98b09c6bf0c
https://habr.com/ru/articles/492106/

https://ru.wikipedia.org/wiki/%D0%90%D0%B3%D1%80%D0%B5%D0%B3%D0%B8%D1%80%D0%BE%D0%B2%D0%B0%D0%BD%D0%B8%D0%B5_(%D0%BF%D1%80%D0%BE%D0%B3%D1%80%D0%B0%D0%BC%D0%BC%D0%B8%D1%80%D0%BE%D0%B2%D0%B0%D0%BD%D0%B8%D0%B5)

https://habr.com/ru/articles/354046/

https://jelf.github.io/ru/ruby/2017/08/26/about-monkey-patching.html

## Посмотреть:

https://www.youtube.com/watch?v=8OuzIAuMfjw
https://www.youtube.com/watch?v=X1HSGEADAhE&t=11s
