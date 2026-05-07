import { runIO } from "./index.ts";
import { myProgram } from "./main.ts";
import { World } from "./worlds.ts";

const world: World = {
  readLine: async () => prompt("") ?? "",
  writeLine: async (s: string) => {
    console.log(s);
  },
};

void runIO(myProgram, world);
