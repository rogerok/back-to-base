import * as E from "fp-ts/lib/Either.js";
import { pipe } from "fp-ts/lib/function.js";
import * as IO from "fp-ts/lib/IO.js";
import * as IOEither from "fp-ts/lib/IOEither.js";
import * as TE from "fp-ts/lib/TaskEither.js";
import { readFileSync } from "node:fs";

export const readFile = (path: string, encoding: BufferEncoding) =>
  pipe(IOEither.tryCatch(() => readFileSync(path, encoding), E.toError));
