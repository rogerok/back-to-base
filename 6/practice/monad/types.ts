import { IOGen } from "./index.ts";

export type RawIO<A> = Fetch<A> | IOPure<A> | IOReadLine<A> | IOWriteLine<A>;
export type IO<A> = {
  [Symbol.iterator](): IOGen<A>;
} & RawIO<A>;
export type IOPure<A> = {
  tag: "pure";
  value: A;
};

export type IOReadLine<A> = {
  tag: "readLine";
  next: (s: string) => IO<A>;
};

export type IOWriteLine<A> = {
  next: IO<A>;
  tag: "writeLine";
  text: string;
};

export type Fetch<A> = {
  tag: "fetch";
  url: string;
  options?: RequestInit;
  next: (body: string) => IO<A>;
};

export type Sleep<A> = {
  ms: number;
  next: IO<A>;
  tag: "sleep";
};
