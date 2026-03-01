// import { Position } from "./components/position.ts";
// import { Size } from "./components/size.ts";
// import { Velocity } from "./components/velocity.ts";
// import { MyEntity } from "./entities/my-entity.ts";
// import { AbstractEntitySystem } from "./lib/system.ts";
//
// export class CollisionSystem extends AbstractEntitySystem<MyEntity> {
//   constructor(priority: number = 0) {
//     super(priority, [Position, Velocity, Size]);
//   }
//
//   /**
//    * Performs the collision detection,
//    * i.e. makes sure each entity stays in the scene.
//    */
//   processEntity(entity: MyEntity) {
//     const position = entity.components.get(Position);
//     console.log(position);
//   }
// }
//
// const entity = new MyEntity();
//
// const position = new Position();
//
// entity.components.add(position);
//
// const collision = new CollisionSystem();
//
// collision.processEntity(entity);
