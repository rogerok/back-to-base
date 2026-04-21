import { pipe } from 'fp-ts/function';
import * as RTE from 'fp-ts/ReaderTaskEither';
import * as TE from 'fp-ts/TaskEither';
import * as R from 'fp-ts/Reader';

// Your solution here
// Hint: ReaderTaskEither<Env, Error, Value> = (env: Env) => TaskEither<Error, Value>
// Use RTE.ask, RTE.asks, RTE.chain, RTE.fromTaskEither, RTE.left/right
// Run with: pipe(program, RTE.run(appEnv))() — or just program(appEnv)()
