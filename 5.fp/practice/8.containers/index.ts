import { first, pipe, prop, split } from "remeda";

type User = {
  active: boolean;
  id: number;
  name: string;
};

const user = { active: true, id: 2, name: "Albert" };

const letter = (user: User) => pipe(user, prop("name"), split(""), first);
const s = letter(user);

console.log(s);
