import { Position } from "../components/position.ts";
import { Size } from "../components/size.ts";
import { Velocity } from "../components/velocity.ts";
import { MyEntity } from "../entities/my-entity.ts";
import { Engine } from "../lib/engine.ts";
import { AbstractEntitySystem } from "../lib/system.ts";

export class GravitySystem extends AbstractEntitySystem<MyEntity> {
  // @ts-ignore
  canvas: HTMLCanvasElement;

  constructor(
    public speed: number,
    priority?: number,
  ) {
    super(priority, [Position, Velocity, Size]);
  }

  onAddedToEngine(engine: Engine) {
    super.onAddedToEngine(engine);
    this.canvas = <HTMLCanvasElement>document.getElementById("canvas");
  }

  processEntity(entity: MyEntity) {
    const position = entity.components.get(Position);
    const velocity = entity.components.get(Velocity);
    const size = entity.components.get(Size);
    if (position.y + size.height < this.canvas.height)
      velocity.y += this.speed * (size.width * size.height) * 0.01;
    else if (velocity.y !== 0) {
      velocity.y *= 0.5;
      if (Math.floor(Math.abs(velocity.y)) === 0) {
        position.y = this.canvas.height - size.height;
        velocity.y = 0;
      }
    }
  }
}
