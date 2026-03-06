import { Component } from "../lib/component.ts";

export class Position implements Component {
  constructor(
    public x = 0,
    public y = 0,
  ) {}
}
