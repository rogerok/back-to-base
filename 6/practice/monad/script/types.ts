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

export type IOGen<A> = Generator<YieldWrap<Freer<Instr<any>, any>>, A>;
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

export type TReadLine = { _resp: string; tag: "readLine" };
export type TWriteLine = { _resp: void; tag: "writeLine"; text: string };
export type TFail = { _resp: never; error: unknown; tag: "fail" };
export type TFetch<R> = { _resp: R; tag: "fetch"; url: string; options?: RequestInit };
export type TPure<A> = { tag: "pure"; value: A };

export type Instr<R> = TFail | TFetch<R> | TReadLine | TWriteLine;

export type RawFreer<I extends Instr<any>, A> =
  | TPure<A>
  | {
      op: I;
      tag: "impure";
      cont: (resp: I["_resp"]) => Freer<I, A>;
    };

export type Freer<I extends Instr<any>, A> = {
  [Symbol.iterator](): IOGen<A>;
} & RawFreer<I, A>;
