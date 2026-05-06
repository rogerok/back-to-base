import { myProgram, runIO } from "./index.ts";
import { World } from "./worlds.ts";

const world: World = {
  readLine: async () => prompt("") ?? "",
  writeLine: async (s: string) => {
    console.log(s);
  },
};

void runIO(myProgram, world);
