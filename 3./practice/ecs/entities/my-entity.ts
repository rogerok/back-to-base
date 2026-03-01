import { AbstractEntity } from "../lib/entity.ts";

export class MyEntity extends AbstractEntity {
  constructor() {
    super(crypto.randomUUID());
  }
}
