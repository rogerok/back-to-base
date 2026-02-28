import { Component } from "../lib/component.ts";

const id = crypto.randomUUID();

export class Position implements Component {
  constructor(
    public x = 0,
    public y = 0,
  ) {}
}
