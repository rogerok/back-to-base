import { Left, Maybe, Right, type Either } from "./containers.ts";

export const foldEither = (either: Either<unknown, unknown> | undefined): string | undefined => {
  if (!either) return undefined;
  if (either instanceof Left) {
    const err = either._value;
    return `LEFT:${err instanceof Error ? err.message : String(err)}`;
  }
  if (either instanceof Right) {
    return "RIGHT";
  }
  return undefined;
};

export const maybeInnerValue = (maybe: Maybe<unknown>): unknown =>
  (maybe as Maybe<unknown>)._value;
