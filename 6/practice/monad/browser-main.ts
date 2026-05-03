import { myProgram, runIO, type World } from "./index";

const world: World = {
  readLine: async () => prompt("") ?? "",
  writeLine: async (s: string) => {
    console.log(s);
  },
};

void runIO(myProgram, world);
