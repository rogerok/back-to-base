import { Component } from "./component.ts";

export interface ComponentClass<T extends Component> extends Class<T> {
  readonly id?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export interface Class<T> extends Function {
  new (...args: never[]): T;
}

type Comp = Component | ComponentClass<Component>;
