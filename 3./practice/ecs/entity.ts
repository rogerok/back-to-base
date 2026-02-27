import { Component } from "./component.ts";

export class Entity {
  onCom;

  constructor(id?: string) {
    this.id = id;
  }

  private _id?: string;

  get id(): string {
    return this.id;
  }

  private _components: Component[] = [];

  get components(): Component[] {
    return this.components;
  }

  add(component: Component) {
    this.components.push(component);
  }
}
