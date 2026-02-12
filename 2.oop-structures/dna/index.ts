import { match } from "ts-pattern";

export const NucleotideMap = {
  Adenine: "Adenine",
  Cytosine: "Cytosine",
  Guanine: "Guanine",
  Thymine: "Thymine",
} as const;

export const NucleotideValues = {
  [NucleotideMap.Adenine]: 0b00,
  [NucleotideMap.Cytosine]: 0b01,
  [NucleotideMap.Guanine]: 0b10,
  [NucleotideMap.Thymine]: 0b11,
} as const;

type ObjectValues<T> = T[keyof T];

type NucleotideCode = ObjectValues<typeof NucleotideValues>;

type Adenine = typeof NucleotideMap.Adenine;
type Cytosine = typeof NucleotideMap.Cytosine;
type Guanine = typeof NucleotideMap.Guanine;
type Thymine = typeof NucleotideMap.Thymine;

export type Nucleotide = Adenine | Cytosine | Guanine | Thymine;

export const encodeNucleotide = (nucleotide: Nucleotide): NucleotideCode =>
  match<Nucleotide>(nucleotide)
    .with(NucleotideMap.Adenine, () => NucleotideValues[NucleotideMap.Adenine])
    .with(NucleotideMap.Cytosine, () => NucleotideValues[NucleotideMap.Cytosine])
    .with(NucleotideMap.Guanine, () => NucleotideValues[NucleotideMap.Guanine])
    .with(NucleotideMap.Thymine, () => NucleotideValues[NucleotideMap.Thymine])
    .exhaustive();

export const decodeNucleotide = (nucleotide: NucleotideCode): Nucleotide =>
  match<NucleotideCode>(nucleotide)
    .with(NucleotideValues[NucleotideMap.Adenine], () => NucleotideMap.Adenine)
    .with(NucleotideValues[NucleotideMap.Cytosine], () => NucleotideMap.Cytosine)
    .with(NucleotideValues[NucleotideMap.Guanine], () => NucleotideMap.Guanine)
    .with(NucleotideValues[NucleotideMap.Thymine], () => NucleotideMap.Thymine)
    .exhaustive();

export const encode = (arr: Nucleotide[]): number => {
  return arr.reduce((acc, item) => {
    const nucleotide = encodeNucleotide(item);
    return (acc << 2) | nucleotide;
  }, 0);
};

export const decode = (num: number) => {
  const arr: Nucleotide[] = [];
  const bitString = num.toString(2).padStart(8, "0");

  for (let i = 0; i < bitString.length; i += 2) {
    const code = parseInt(bitString.slice(i, i + 2), 2) as NucleotideCode;
    arr.push(decodeNucleotide(code));
  }
  return arr;
};
