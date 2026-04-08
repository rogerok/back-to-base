import { Left, Right } from "./containers.js";

export const foldEither = (either) => {
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
