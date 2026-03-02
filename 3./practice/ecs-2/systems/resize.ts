import { Velocity } from "../components/velocity.ts";
import { Engine } from "../lib/engine.ts";
import { System } from "../lib/system.ts";

export class ResizeSystem extends System {
  // aspect: Aspect;
  canvas: HTMLCanvasElement;
  dirty: boolean;
  oldHeight: number;

  constructor(priority?: number) {
    super(priority);
    this.dirty = false;
    this.oldHeight = window.innerHeight;
    window.addEventListener("resize", () => {
      if (window.innerHeight > this.oldHeight) this.oldHeight = window.innerHeight;
      else this.dirty = true;
    });
  }

  onAddedToEngine(engine: Engine) {
    // this.aspect = Aspect.for(engine).one(Velocity);
    this.canvas = <HTMLCanvasElement>document.getElementById("canvas");
  }

  process() {
    if (!this.dirty) return;
    const diff = Math.min(20, this.oldHeight - window.innerHeight);
    this.aspect.entities.forEach((entity) => {
      const velocity = entity.components.get(Velocity);
      if (velocity.y === 0) {
        velocity.y -= diff;
      }
    });
    this.oldHeight = window.innerHeight;
    this.dirty = false;
  }
}
