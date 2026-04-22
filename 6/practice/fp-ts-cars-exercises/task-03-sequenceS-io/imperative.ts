// Task 3: sequenceS(IO.Apply) — создание структуры из нескольких IO-эффектов
//
// В задании от ментора generateCar создавал объект из нескольких R.randomInt/R.randomElem,
// объединяя их через sequenceS(IO.Apply).
// Здесь — аналогичная задача: генерация персонажа для RPG.
//
// Перепиши используя:
// - sequenceS(IO.Apply) для объединения нескольких IO в один IO<struct>
// - R.randomInt, R.randomElem из fp-ts/Random

interface Character {
  class: "warrior" | "mage" | "rogue";
  strength: number;
  intelligence: number;
  agility: number;
  weapon: string;
}

const CLASSES = ["warrior", "mage", "rogue"] as const;
const WEAPONS = ["sword", "staff", "dagger", "bow", "axe"] as const;

function generateCharacter(): Character {
  const cls = CLASSES[Math.floor(Math.random() * CLASSES.length)];
  const strength = Math.floor(Math.random() * 18) + 3; // 3-20
  const intelligence = Math.floor(Math.random() * 18) + 3;
  const agility = Math.floor(Math.random() * 18) + 3;
  const weapon = WEAPONS[Math.floor(Math.random() * WEAPONS.length)];

  return {
    class: cls,
    strength,
    intelligence,
    agility,
    weapon,
  };
}

export { generateCharacter, CLASSES, WEAPONS };
export type { Character };
