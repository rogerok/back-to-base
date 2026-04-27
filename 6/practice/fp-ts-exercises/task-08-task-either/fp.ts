import * as E from "fp-ts/lib/Either.js";
import { flow, pipe } from "fp-ts/lib/function";
import * as J from "fp-ts/lib/Json.js";
import * as T from "fp-ts/lib/Task.js";
import * as TE from "fp-ts/lib/TaskEither.js";
// Your solution here
// Hint: use TE.tryCatch to wrap fetch calls, then TE.chain to sequence them
import * as t from "io-ts";
import * as PathReporter from "io-ts/lib/PathReporter";

// Если хочешь запрещать лишние поля, используй t.exact(...)
export const PostC = t.exact(
  t.type({
    body: t.string,
    id: t.number,
    title: t.string,
    userId: t.number,
  }),
);

export const UserProfileC = t.exact(
  t.type({
    email: t.string,
    id: t.number,
    name: t.string,
  }),
);

export const EnrichedPostC = t.exact(
  t.type({
    author: UserProfileC,
    post: PostC,
  }),
);

type NetworkError = { _tag: "NetworkError"; message: string };
type HttpError = { _tag: "HttpError"; status: number; statusText: string };
type ParseError = { _tag: "ParseError"; message: string };
type DecodeError = { _tag: "DecodeError"; message: string };

type AppError = DecodeError | HttpError | NetworkError | ParseError;

// TS-типы выводятся из кодеков
export type Post = t.TypeOf<typeof PostC>;
export type UserProfile = t.TypeOf<typeof UserProfileC>;
export type EnrichedPost = t.TypeOf<typeof EnrichedPostC>;

const toMessage = (e: unknown): string => (e instanceof Error ? e.message : String(e));

// Simulated async API calls

const fetchJson = (url: string) =>
  pipe(
    TE.tryCatch(
      () => fetch(url),
      (e): AppError => ({ _tag: "NetworkError", message: toMessage(e) }),
    ),
    TE.chain(
      TE.fromPredicate(
        (res) => res.ok,
        (res): AppError => ({
          _tag: "HttpError",
          status: res.status,
          statusText: res.statusText,
        }),
      ),
    ),
    TE.chain((res) =>
      TE.tryCatch(
        () => res.text(),
        (e): AppError => ({ _tag: "ParseError", message: toMessage(e) }),
      ),
    ),
    TE.chainEitherK(
      flow(
        J.parse,
        E.mapLeft((e): AppError => ({ _tag: "ParseError", message: toMessage(e) })),
      ),
    ),
  );

const fetchPost = (id: number) =>
  pipe(
    fetchJson(`https://jsonplaceholder.typicode.com/posts/${id}`),
    TE.chainEitherK(
      flow(
        PostC.decode,
        E.mapLeft(
          (errs): AppError => ({
            _tag: "DecodeError",
            message: PathReporter.failure(errs).join("; "),
          }),
        ),
      ),
    ),
  );

const fetchUser = (id: number) =>
  pipe(
    fetchJson(`https://jsonplaceholder.typicode.com/users/${id}`),
    TE.chainEitherK(
      flow(
        UserProfileC.decode,
        E.mapLeft(
          (errs): AppError => ({
            _tag: "DecodeError",
            message: PathReporter.failure(errs).join("; "),
          }),
        ),
      ),
    ),
  );

const getEnrichedPost = (postId: number) =>
  pipe(
    TE.Do,
    TE.bind("post", () => fetchPost(postId)),
    TE.bindW("author", ({ post }) => fetchUser(post.userId)),
    TE.chainEitherKW(
      flow(
        EnrichedPostC.decode,
        E.mapLeft(
          (errs): AppError => ({
            _tag: "DecodeError",
            message: PathReporter.failure(errs).join("; "),
          }),
        ),
      ),
    ),
    TE.matchW(
      (e) => e,
      (v) => v,
    ),
  )();

const post = await getEnrichedPost(1);
console.log(post);
