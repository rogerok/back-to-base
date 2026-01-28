Расположение решений практических заданий

1. DNA Encoding [ссылка на оригинал задачи](https://exercism.org/tracks/gleam/exercises/dna-encoding)
   `/statements/practice/dna`
2. Написать свою функцию мемоизации и подумать над тем, чтобы в ней не утекала память (инвалидация кеша)
   `/memoization/practice`
3. Написать роутер со своей системой мидлвар (пока только систему мидлвар, сам роутинг потом)
   `/router/practice`

   ```ts
   interface Router {
     use(middleware: Middleware): void;
     use(path: string, middleware: Middleware): void;

     handle(req: Request, res: Response): void;
   }

   function test2() {
     const router = new Router();
     const callOrder: number[] = [];

     router.use((req, res) => {
       callOrder.push(1);
     });
     router.use((req, res, next) => {
       callOrder.push(2);
       setTimeout(() => next(), 10);
     });
     router.use((req, res) => {
       callOrder.push(3);
     });

     router.handle(mockReq, mockRes);

     setTimeout(() => {
       console.assert(callOrder.join(",") === "1,2,3", "correct execution order");
     }, 50);
   }
   ```

4. Реализовать свой кусочек css-in-js:
   `/tagged-templates/practice`

   ```js
   css`
     color: red;
   `; // { color: red }
   const fn = css`
     color: ${(theme) => theme.color};
   `;
   fn({ color: "green" }); // { color: 'green' }

   css`
   padding-top-end: 10
   padding-bottom-end: 10rem
   `; // { paddingTopEnd: '10px', paddingBottomEnd:  '10rem' }
   ```
