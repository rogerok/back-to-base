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
  [NucleotideMap.Guanine]: 0b1010,
  [NucleotideMap.Thymine]: 0b1011,
} as const;

export type Nucleotide =
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

export type TNucleotide = Nucleotide["type"];
export type TNucleotideCode = Nucleotide["code"];

export const encodeNucleotide = (nucleotide: TNucleotide): TNucleotideCode =>
  match<TNucleotide>(nucleotide)
    .with(NucleotideMap.Adenine, () => NucleotideValues[NucleotideMap.Adenine])
    .with(NucleotideMap.Cytosine, () => NucleotideValues[NucleotideMap.Cytosine])
    .with(NucleotideMap.Guanine, () => NucleotideValues[NucleotideMap.Guanine])
    .with(NucleotideMap.Thymine, () => NucleotideValues[NucleotideMap.Thymine])
    .exhaustive();

export const decodeNucleotide = (nucleotide: TNucleotideCode): TNucleotide =>
  match<TNucleotideCode>(nucleotide)
    .with(NucleotideValues[NucleotideMap.Adenine], () => NucleotideMap.Adenine)
    .with(NucleotideValues[NucleotideMap.Cytosine], () => NucleotideMap.Cytosine)
    .with(NucleotideValues[NucleotideMap.Guanine], () => NucleotideMap.Guanine)
    .with(NucleotideValues[NucleotideMap.Thymine], () => NucleotideMap.Thymine)
    .exhaustive();

export const encode = (arr: TNucleotide[]): number => {
  return arr.reduce((acc, item) => {
    return acc + (acc | NucleotideValues[item]);
  }, 0);
};

// TODO: implement decode func

/*
 *4. Decode a DNA bit array
  Implement decode to accept a bit array representing nucleic acid and return the decoded data as a list of nucleotides.
 * decode(<<27>>)
   // -> Ok([Adenine, Cytosine, Guanine, Thymine])
 *
 * */