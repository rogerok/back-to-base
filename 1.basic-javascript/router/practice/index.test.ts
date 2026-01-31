// function test2() {
//   const router = new Router();
//   const callOrder: number[] = [];
//
//   router.use((req, res) => {
//     callOrder.push(1);
//   });
//   router.use((req, res, next) => {
//     callOrder.push(2);
//     setTimeout(() => next(), 10);
//   });
//   router.use((req, res) => {
//     callOrder.push(3);
//   });
//
//   router.handle(mockReq, mockRes);
//
//   setTimeout(() => {
//     console.assert(callOrder.join(",") === "1,2,3", "correct execution order");
//   }, 50);
// }
