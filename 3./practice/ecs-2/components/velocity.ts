import { Component } from "../component.ts";

export class Velocity implements Component {
  constructor(
    public x = 0,
    public y = 0,
  ) {}
}
