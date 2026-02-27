import { System } from "./system.ts";

export class Engine {
  systems: System[] = [];

  addSystem(system: System): void {
    this.systems.push(system);
  }
}
