import { match } from "ts-pattern";

const NucleotideMap = {
  Adenine: "Adenine",
  Cytosine: "Cytosine",
  Guanine: "Guanine",
  Thymine: "Thymine",
} as const;

const NucleotideValues = {
  [NucleotideMap.Adenine]: 0b00,
  [NucleotideMap.Cytosine]: 0b01,
  [NucleotideMap.Guanine]: 0b1010,
  [NucleotideMap.Thymine]: 0b1011,
} as const;

type Nucleotide =
  | {
      code: (typeof NucleotideValues)[typeof NucleotideMap.Adenine];
      type: typeof NucleotideMap.Adenine;
    }
  | {
      code: (typeof NucleotideValues)[typeof NucleotideMap.Cytosine];
      type: typeof NucleotideMap.Cytosine;
    }
  | {
      code: (typeof NucleotideValues)[typeof NucleotideMap.Guanine];
      type: typeof NucleotideMap.Guanine;
    }
  | {
      code: (typeof NucleotideValues)[typeof NucleotideMap.Thymine];
      type: typeof NucleotideMap.Thymine;
    };

type TNucleotide = Nucleotide["type"];
type TNucleotideCode = Nucleotide["code"];

const encodeNucleotide = (nucleotide: TNucleotide): TNucleotideCode =>
  match<TNucleotide>(nucleotide)
    .with(NucleotideMap.Adenine, () => NucleotideValues[NucleotideMap.Adenine])
    .with(NucleotideMap.Cytosine, () => NucleotideValues[NucleotideMap.Cytosine])
    .with(NucleotideMap.Guanine, () => NucleotideValues[NucleotideMap.Guanine])
    .with(NucleotideMap.Thymine, () => NucleotideValues[NucleotideMap.Thymine])
    .exhaustive();

const decodeNucleotide = (nucleotide: TNucleotideCode): TNucleotide =>
  match<TNucleotideCode>(nucleotide)
    .with(NucleotideValues[NucleotideMap.Adenine], () => NucleotideMap.Adenine)
    .with(NucleotideValues[NucleotideMap.Cytosine], () => NucleotideMap.Cytosine)
    .with(NucleotideValues[NucleotideMap.Guanine], () => NucleotideMap.Guanine)
    .with(NucleotideValues[NucleotideMap.Thymine], () => NucleotideMap.Thymine)
    .exhaustive();

const encode = (arr: TNucleotide[]): number => {
  return arr.reduce((acc, item) => {
    return acc + (acc | NucleotideValues[item]);
  }, 0);
};

console.log(encode(["Adenine", "Cytosine", "Guanine", "Thymine"]));

const decode = (v: number) => {
  const arr = [];
  let rem = 0;
  let val = v;

  while (val > 0) {
    rem = Math.floor(val % 2);
    arr.push(rem);
    val = Math.floor(val / 2);
  }

  return arr;
};

class Stack<T> {
  items: T[] = [];

  push(item: T) {
    this.items.push(item);
  }

  pop(): T | undefined {
    return this.items.pop();
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }
}

function divideBy2(decNumber: number): string {
  const stack = new Stack();
  let rem = 0;
  let binaryString = "";
  let decNum = decNumber;

  while (decNum > 0) {
    rem = Math.floor(decNum % 2);
    stack.push(rem);
    decNum = Math.floor(decNum) / 2;
  }

  console.log("after first while", stack);

  while (!stack.isEmpty()) {
    // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
    binaryString += stack.pop();
  }

  return binaryString;
}

console.log(divideBy2(27));
console.log(decode(27));
