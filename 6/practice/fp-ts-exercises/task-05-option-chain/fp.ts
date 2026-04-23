import { flow, pipe } from "fp-ts/lib/function";
import { concatAll } from "fp-ts/lib/Monoid.js";
import * as O from "fp-ts/lib/Option.js";
import * as String from "fp-ts/lib/string.js";

// Your solution here
interface Config {
  database?: {
    host?: string;
    port?: number;
  };
}

const config: Config = {
  database: {
    host: "localhost",
    port: 5432,
  },
};

const emptyConfig: Config = {};

const buildConnectionString = (cfg: Config) =>
  pipe(
    O.fromNullable(cfg.database),
    O.flatMap((c) =>
      pipe(
        c,
        O.fromNullable,
        O.map((c) => ({
          host: c.host,
          port: c.port,
        })),
      ),
    ),
    O.flatMap((c) =>
      pipe(
        c.host,
        O.fromNullable,
        O.map((h) => ({
          host: h,
          port: c.port,
        })),
      ),
    ),
    O.flatMap((c) =>
      pipe(
        c.port,
        O.fromPredicate((c) => (c === undefined ? true : c > 1 && c < 65535)),
        O.map((port) =>
          pipe(
            port,
            O.fromNullable,
            O.fold(
              () => `postgresql://${c.host}`,
              (p) => `postgresql://${c.host}:${p.toString()}`,
            ),
          ),
        ),
      ),
    ),
  );

const getConnectionOrDefault = flow(
  buildConnectionString,
  O.fold(
    () => "postgresql://localhost:5432",
    (s) => s,
  ),
);

console.log(getConnectionOrDefault(config)); // "postgresql://localhost:5432"
console.log(getConnectionOrDefault(emptyConfig)); // "postgresql://localhost:5432"
console.log(getConnectionOrDefault({ database: { host: "prod.db", port: 99999 } }));
