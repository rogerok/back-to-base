export type RawIO<A, E = never> =
  | IOFail<E>
  | IOFetch<A, E>
  | IOPure<A>
  | IOReadLine<A, E>
  | IOWriteLine<A, E>;

export class YieldWrap<T> {
  readonly _Y!: () => T;
  constructor(readonly value: T) {}
}

export type Result<E, A> = { error: E; ok: false } | { ok: true; value: A };

export type IOGen<A> = Generator<YieldWrap<IO<any>>, A>;
export type IO<A, E = never> = {
  [Symbol.iterator](): IOGen<A>;
} & RawIO<A, E>;

export type IOFail<E> = {
  error: E;
  tag: "fail";
};

export type IOPure<A> = {
  tag: "pure";
  value: A;
};

export type IOReadLine<A, E> = {
  tag: "readLine";
  next: (s: string) => IO<A, E>;
};

export type IOWriteLine<A, E> = {
  next: IO<A, E>;
  tag: "writeLine";
  text: string;
};

export type IOFetch<A, E> = {
  tag: "fetch";
  url: string;
  options?: RequestInit;
  next: (body: string) => IO<A, E>;
};

export type IOSleep<A> = {
  ms: number;
  next: IO<A>;
  tag: "sleep";
};
