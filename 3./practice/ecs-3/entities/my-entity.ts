import { Entity } from "../lib/entity.ts";

export class MyEntity extends Entity {
  constructor() {
    super(crypto.randomUUID());
  }
}
