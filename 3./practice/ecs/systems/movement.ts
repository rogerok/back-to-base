import { Position } from "../components/position.ts";
import { Velocity } from "../components/velocity.ts";
import { MyEntity } from "../entities/my-entity.ts";
import { AbstractEntitySystem } from "../lib/system.ts";

export class MovementSystem extends AbstractEntitySystem<MyEntity> {
  constructor(priority: number = 0) {
    super(priority, [Position, Velocity]);
  }

  processEntity(entity: MyEntity) {
    const position = entity.components.get(Position);
    const velocity = entity.components.get(Velocity);
    position.x += velocity.x;
    position.y += velocity.y;
  }
}
