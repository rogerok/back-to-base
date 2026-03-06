// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export interface Class<T> extends Function {
  new (...args: never[]): T;
}
