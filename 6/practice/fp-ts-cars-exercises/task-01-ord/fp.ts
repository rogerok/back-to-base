// Task 1: Ord + contramap + Ord.getMonoid + concatAll
//
// Перепиши compareStudents и sortStudents используя fp-ts:
// - pipe, Ord.contramap, Ord.reverse
// - Ord.getMonoid() + concatAll
// - ReadonlyArray.sort
//
// Приоритет: gpa (desc) > attendance (desc) > demerits (asc)

import { pipe } from "fp-ts/function";
import { concatAll } from "fp-ts/Monoid";
import * as N from "fp-ts/number";
import * as Ord from "fp-ts/Ord";
import * as RA from "fp-ts/ReadonlyArray";

interface Student {
  name: string;
  gpa: number;
  attendance: number;
  demerits: number;
}

// TODO: создай ord для каждого поля через Ord.contramap
// const ordByGpa = pipe(N.Ord, Ord.reverse, Ord.contramap((s: Student) => s.gpa))
// const ordByAttendance = ...
// const ordByDemerits = ...

// TODO: объедини орды через Ord.getMonoid + concatAll
// const M = Ord.getMonoid<Student>()
// const complexOrd = concatAll(M)([ordByGpa, ordByAttendance, ordByDemerits])

// TODO: реализуй compareStudents через complexOrd.compare
const compareStudents = (a: Student, b: Student): number => {
  throw new Error("TODO");
};

// TODO: реализуй sortStudents через RA.sort(complexOrd)
const sortStudents = (students: Student[]): Student[] => {
  throw new Error("TODO");
};

export { compareStudents, sortStudents };
export type { Student };
