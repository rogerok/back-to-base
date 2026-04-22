// Task 3: sequenceS(IO.Apply) — создание структуры из нескольких IO
//
// Перепиши generateCharacter используя fp-ts:
// - R.randomInt(min, max) для чисел
// - R.randomElem(array) для выбора из массива
// - sequenceS(IO.Apply) для объединения в структуру
// - Результат: IO.IO<Character>

import { pipe } from "fp-ts/function";
import { sequenceS } from "fp-ts/Apply";
import * as IO from "fp-ts/IO";
import * as R from "fp-ts/Random";

interface Character {
  class: "warrior" | "mage" | "rogue";
  strength: number;
  intelligence: number;
  agility: number;
  weapon: string;
}

const CLASSES = ["warrior", "mage", "rogue"] as const;
const WEAPONS = ["sword", "staff", "dagger", "bow", "axe"] as const;

// TODO: используй sequenceS(IO.Apply) чтобы собрать объект из IO-эффектов
// const generateCharacter: IO.IO<Character> = pipe(
//   {
//     class: R.randomElem(CLASSES),
//     strength: R.randomInt(3, 20),
//     ...
//   },
//   sequenceS(IO.Apply),
// )

const generateCharacter: IO.IO<Character> = () => {
  throw new Error("TODO");
};

export { generateCharacter, CLASSES, WEAPONS };
export type { Character };
