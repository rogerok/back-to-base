// Task 1: Ord + contramap + Ord.getMonoid + concatAll
//
// Тема: составное сравнение объектов.
// В задании от ментора ты видел, как через Ord.contramap и concatAll(Ord.getMonoid())
// строится комплексный компаратор для машин. Здесь — аналогичная задача с другим доменом.
//
// Перепиши compareStudents и sortStudents используя:
// - Ord.contramap для создания ордов по отдельным полям
// - Ord.reverse для обратного порядка
// - Ord.getMonoid() + concatAll для объединения ордов
// - ReadonlyArray.sort для сортировки

interface Student {
  name: string;
  gpa: number; // 0-4, больше = лучше
  attendance: number; // 0-100%, больше = лучше
  demerits: number; // штрафные баллы, меньше = лучше
}

// Приоритет сравнения: gpa (desc) > attendance (desc) > demerits (asc)
function compareStudents(a: Student, b: Student): number {
  // Сначала по GPA (больше = лучше)
  if (a.gpa !== b.gpa) {
    return b.gpa - a.gpa;
  }
  // Потом по посещаемости (больше = лучше)
  if (a.attendance !== b.attendance) {
    return b.attendance - a.attendance;
  }
  // Потом по штрафам (меньше = лучше)
  return a.demerits - b.demerits;
}

function sortStudents(students: Student[]): Student[] {
  return [...students].sort(compareStudents);
}

// ─── Тесты (не менять) ──────────────────────────────────────────────────────

export { compareStudents, sortStudents };
export type { Student };
