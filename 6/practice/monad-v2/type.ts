export type Pure1<A> = {
  tag: "pure";
  value: A;
};
export type Readline1<A> = {
  tag: "readLine";
  next: (a: string) => IO<A>;
};
export type WriteLine1<A> = {
  next: IO<A>;
  tag: "writeLine";
  text: string;
};
export type IO<A> = Pure1<A> | Readline1<A> | WriteLine1<A>;
