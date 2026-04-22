// Task 5: Monoid + concatAll — агрегация данных
//
// Перепиши используя fp-ts:
// - concatAll(N.MonoidSum) для суммирования (как calculateScore у ментора)
// - concatAll(B.MonoidAll) для allCorrect
// - Monoid из fp-ts/Monoid для создания своих моноидов
// - pipe + RA.map для преобразования перед агрегацией

import { pipe } from "fp-ts/function";
import { concatAll, struct, type Monoid } from "fp-ts/Monoid";
import * as N from "fp-ts/number";
import * as B from "fp-ts/boolean";
import * as RA from "fp-ts/ReadonlyArray";

interface GameStats {
  totalScore: number;
  roundsPlayed: number;
  allCorrect: boolean;
  bestStreak: number;
}

interface RoundResult {
  correct: boolean;
  points: number;
}

// TODO: sumScores через concatAll(N.MonoidSum)
// const sumScores = concatAll(N.MonoidSum)
const sumScores = (scores: number[]): number => {
  throw new Error("TODO");
};

// TODO: aggregateStats
// Подсказка 1: для totalScore, roundsPlayed, allCorrect можно использовать
//   struct({ totalScore: N.MonoidSum, roundsPlayed: N.MonoidSum, allCorrect: B.MonoidAll })
// Подсказка 2: bestStreak сложнее — это не стандартный моноид.
//   Можно оставить его императивным или написать свой Monoid<number> с concat = Math.max
//   Или посчитать отдельно и объединить результаты
// Подсказка 3: RA.map преобразует RoundResult[] → массив промежуточных структур,
//   а concatAll сворачивает их

const aggregateStats = (results: RoundResult[]): GameStats => {
  throw new Error("TODO");
};

export { aggregateStats, sumScores };
export type { GameStats, RoundResult };
