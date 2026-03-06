import { Component } from "../lib/component.ts";

export class Size implements Component {
  constructor(
    public width = 10,
    public height = 10,
  ) {}
}
