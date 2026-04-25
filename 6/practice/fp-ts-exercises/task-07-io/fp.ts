import { sequenceS } from "fp-ts/Apply";
import { pipe } from "fp-ts/function";
import * as A from "fp-ts/lib/Array.js";
import * as Console from "fp-ts/lib/Console.js";
import * as E from "fp-ts/lib/Either.js";
import { flow } from "fp-ts/lib/function";
import * as IO from "fp-ts/lib/IO.js";
import * as IOE from "fp-ts/lib/IOEither.js";
import * as IOEither from "fp-ts/lib/IOEither.js";
import * as J from "fp-ts/lib/Json.js";
import * as O from "fp-ts/lib/Option.js";
import * as t from "io-ts";
import * as tt from "io-ts-types";

// Your solution here
// Hint: wrap each side effect in IO, then compose with IO.map / IO.chain

const LogEntry = t.type({
  id: t.string,
  message: t.string,
  timestamp: t.number,
});

type LogEntry = t.TypeOf<typeof LogEntry>;

const LogsString = tt.JsonFromString.pipe(t.array(LogEntry));

const getRandom: IO.IO<string> = () => Math.random().toString(36).slice(2);
const getTimestamp: IO.IO<number> = () => Date.now();
const getItem: IO.IO<O.Option<string>> = () => O.fromNullable(localStorage.getItem("logs"));
const setItem = (v: LogEntry[]): IO.IO<void> =>
  pipe(
    v,
    J.stringify,
    E.fold(
      () => Console.log("Cant write to storage"),
      (j) => () => {
        localStorage.setItem("logs", j);
      },
    ),
  );

const createLogEnry = (message: string): IO.IO<LogEntry> =>
  pipe(
    IO.Do,
    IO.bind("timestamp", () => getTimestamp),
    IO.bind("id", () => getRandom),
    IO.bind("message", () => IO.of(message)),
  );

const parseLogs = flow(
  LogsString.decode,
  E.getOrElse((): LogEntry[] => []),
);

const getLogs = pipe(getItem, IO.map(O.fold(() => [], parseLogs)));

const saveToStorage = (entry: LogEntry) =>
  pipe(
    getLogs,
    IO.map((v) => [...v, entry]),
    IO.flatMap(setItem),
    IO.flatMap(() => Console.log(`[LOG] ${entry.timestamp}: ${entry.message}`)),
  );

const logMsg = flow(createLogEnry, IO.flatMap(saveToStorage));
