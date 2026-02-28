import { Engine } from "./lib/engine.ts";
import { MovementSystem } from "./systems/movement.ts";

const engine = new Engine();

engine.systems.add(new MovementSystem());
