import { CustomPromise2 } from "./index2.ts";

const resolveMessage = "Resolved!";
const fulfillMessage = "Fulfilled";
const rejectError = new Error("Rejected!");
const resolveMessages = [];
const rejectMessages = [];
const expectedResolveMessages = [fulfillMessage, resolveMessage];
const expectedRejectMessages = [rejectError.message, resolveMessage];

test("is not Promise", () => {
  expect(new CustomPromise2(() => {})).not.toBeInstanceOf(Promise);
});

test("executor not a function", () => {
  expect(() => new CustomPromise2()).toThrow("Executor must be a function");
});

test("resolve 1", async () => {
  const actualString = await CustomPromise2.resolve(resolveMessage);
  expect(actualString).toEqual(resolveMessage);
});
test("resolve nonThenableObject", async () => {
  const nonThenableObject = await CustomPromise2.resolve({ resolveMessage, then: "catch" });
  expect(nonThenableObject).toEqual({ resolveMessage, then: "catch" });
});

test("resolve resolvedThenable", async () => {
  const resolvedThenable = {
    then: (onFulfill) => {
      onFulfill("Fulfilled!");
      throw rejectError;
    },
  };
  const actualResolvedThenable = await CustomPromise2.resolve(resolvedThenable);
  expect(actualResolvedThenable).toEqual("Fulfilled!");
});

test("resolve rejectedThenable", async () => {
  const rejectedThenable = {
    then: (onFulfill) => {
      throw rejectError;

      onFulfill("Fulfilled!"); // должно игнорироваться
    },
  };
  await expect(CustomPromise2.resolve(rejectedThenable)).rejects.toThrow(rejectError);
});

test("resolve()", async () => {
  const actualString = await CustomPromise2.resolve(resolveMessage);
  expect(actualString).toEqual(resolveMessage);

  const nonThenableObject = await CustomPromise2.resolve({ resolveMessage, then: "catch" });
  expect(nonThenableObject).toEqual({ resolveMessage, then: "catch" });

  const resolvedThenable = {
    then: (onFulfill) => {
      onFulfill("Fulfilled!");
      throw rejectError;
    },
  };
  const actualResolvedThenable = await CustomPromise2.resolve(resolvedThenable);
  expect(actualResolvedThenable).toEqual("Fulfilled!");

  const rejectedThenable = {
    then: (onFulfill) => {
      throw rejectError;

      onFulfill("Fulfilled!"); // должно игнорироваться
    },
  };
  await expect(CustomPromise2.resolve(rejectedThenable)).rejects.toThrow(rejectError);
});

test("reject()", async () => {
  await expect(CustomPromise2.reject(rejectError)).rejects.toThrow(rejectError);

  const rejectedThenable = {
    then: (onFulfill, onReject) => {
      onReject(rejectError);
    },
  };
  await expect(CustomPromise2.resolve(rejectedThenable)).rejects.toThrow(rejectError);
});

test("then() and catch()", async () => {
  const resolvedPromise = new CustomPromise2((resolve, reject) => {
    resolve(resolveMessage);
    reject(rejectError); // должно игнорироваться
  });
  const resolveString = await resolvedPromise
    .catch((message) => `Catch! ${message}`) // должно игнорироваться
    .then((message) => `Another ${message}`);
  expect(resolveString).toEqual(`Another ${resolveMessage}`);

  const resolveChainResult = await resolvedPromise
    .then((message) => `New another ${message}`)
    .then((message) => message.split(" "))
    .then() // должна отработать функция по умолчанию
    .then((array) => array.reverse())
    .then((array) => array.join(""))
    .catch((message) => `Catch! ${message}`); // должно игнорироваться
  expect(resolveChainResult).toEqual(`New another ${resolveMessage}`.split(" ").reverse().join(""));

  const catchPromise = new CustomPromise2((resolve, reject) => {
    resolve(resolveMessage);
    reject(resolveMessage); // должно игнорироваться
  });
  const catchString = await catchPromise
    .then(() => {
      throw rejectError;
    })
    .catch() // должна отработать функция по умолчанию
    .catch((error) => `Catch! ${error.message}`);
  expect(catchString).toEqual(`Catch! ${rejectError.message}`);

  const rejectedPromise1 = new CustomPromise2((resolve, reject) => {
    reject(rejectError);
    resolve(resolveMessage); // должно игнорироваться
  });
  const rejectString = await rejectedPromise1
    .then((message) => `Another ${message}`) // должно игнорироваться
    .catch((error) => `Catch! Reject message: ${error.message}`);
  expect(rejectString).toEqual(`Catch! Reject message: ${rejectError.message}`);

  const rejectedPromise2 = new CustomPromise2((resolve, reject) => {
    reject(rejectError);
    resolve(resolveMessage); // должно игнорироваться
  });
  const rejectedPromiseResult = rejectedPromise2
    .then((message) => `Another ${message}`) // должно игнорироваться
    .catch((error) => {
      throw new Error(`Error message: ${error.message}`);
    });
  await expect(rejectedPromiseResult).rejects.toThrow(
    new Error(`Error message: ${rejectError.message}`),
  );
});

test("event loop", async () => {
  const resolvedPromise = new CustomPromise2((resolve) => {
    resolve(resolveMessage);
  });
  expect(resolveMessages).toHaveLength(0);

  const processedResolvedPromise = resolvedPromise.then(() => {
    resolveMessages.push(fulfillMessage);
  });
  expect(resolveMessages).toHaveLength(0);

  await processedResolvedPromise.then(() => resolveMessages.push(resolveMessage));
  expect(resolveMessages).toEqual(expectedResolveMessages);

  const rejectedPromise = new CustomPromise2((_, reject) => {
    reject(rejectError);
  });
  expect(rejectMessages).toHaveLength(0);

  const processedRejectedPromise = rejectedPromise.catch((err) => {
    rejectMessages.push(err.message);
  });
  expect(rejectMessages).toHaveLength(0);

  await processedRejectedPromise.then(() => rejectMessages.push(resolveMessage));
  expect(rejectMessages).toEqual(expectedRejectMessages);
});
