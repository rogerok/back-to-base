// Task 5: Monoid + concatAll — агрегация данных
//
// В задании от ментора calculateScore = concatAll(N.MonoidSum) суммировал очки.
// Здесь — более развёрнутая задача: агрегация статистики по нескольким метрикам.
//
// Перепиши используя:
// - concatAll с разными моноидами (MonoidSum, MonoidAll, getMonoid)
// - Struct monoid через getStructMonoid / ручную сборку
// - pipe + ReadonlyArray.map + concatAll

interface GameStats {
  totalScore: number;
  roundsPlayed: number;
  allCorrect: boolean; // true если все ответы верные
  bestStreak: number; // максимальная серия верных ответов
}

interface RoundResult {
  correct: boolean;
  points: number;
}

function aggregateStats(results: RoundResult[]): GameStats {
  let totalScore = 0;
  let roundsPlayed = 0;
  let allCorrect = true;
  let bestStreak = 0;
  let currentStreak = 0;

  for (const r of results) {
    totalScore += r.points;
    roundsPlayed += 1;
    allCorrect = allCorrect && r.correct;

    if (r.correct) {
      currentStreak++;
      bestStreak = Math.max(bestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  return { totalScore, roundsPlayed, allCorrect, bestStreak };
}

// Бонус: простое суммирование массива
function sumScores(scores: number[]): number {
  let sum = 0;
  for (const s of scores) {
    sum += s;
  }
  return sum;
}

export { aggregateStats, sumScores };
export type { GameStats, RoundResult };
