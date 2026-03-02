import { AbstractEntity } from "../entity.ts";

export class MyEntity extends AbstractEntity {
  constructor() {
    super(crypto.randomUUID());
  }
}
