import { stdin as input, stdout as output } from "node:process";
import readline from "node:readline/promises";

import { doIO, fetchUrl, readLine, runIO, writeLine } from "./index.ts";

const myProgram = doIO(function* () {
  yield* writeLine("What is your name?");

  const name = yield* readLine;
  yield* writeLine(`Hello, ${name}! How old are you?`);

  const age = yield* readLine;
  yield* writeLine("Loading greeting of the day...");

  const body = yield* fetchUrl("https://httpbin.org/uuid");
  yield* writeLine(`Wow, ${name}, ${age}! Token: ${body}`);
});

void (async () => {
  const rl = readline.createInterface({ input, output });

  const productionNodeWorld = {
    fetch: async (url: string, options?: RequestInit) => (await fetch(url, options)).text(),
    readLine: () => rl.question(""),
    //  eslint-disable-next-line @typescript-eslint/require-await
    writeLine: async (s: string) => {
      console.log(s);
    },
  };

  await runIO(myProgram, productionNodeWorld);
  rl.close();
});
