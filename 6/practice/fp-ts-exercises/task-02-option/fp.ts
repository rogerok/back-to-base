import * as A from "fp-ts/lib/Array.js";
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/lib/Option.js";

// Your solution here

interface User {
  id: number;
  name: string;
  address?: {
    city?: string;
  };
}

const users: User[] = [
  { address: { city: "NYC" }, id: 1, name: "Alice" },
  { address: {}, id: 2, name: "Bob" },
  { id: 3, name: "Charlie" },
];

// const getUserCity = (id: number) =>
//   pipe(
//     users,
//     A.findFirst((u) => u.id === id),
//     O.fold(
//       () => null,
//       (u) => u.address,
//     ),
//     O.fromNullable,
//     O.fold(
//       () => "unknown",
//       (a) => a.city,
//     ),
//   );

const getUserCity = (id: number) =>
  pipe(
    users,
    A.findFirst((u) => u.id === id),
    O.chain((a) => O.fromNullable(a)),
    O.chain((a) => O.fromNullable(a.address)),
    O.chain((a) => O.fromNullable(a.city)),
    O.getOrElse(() => "unknown"),
  );

console.log(getUserCity(1)); // "NYC"
console.log(getUserCity(2)); // "Unknown"
console.log(getUserCity(3)); // "Unknown"
console.log(getUserCity(4)); // "Unknown"
