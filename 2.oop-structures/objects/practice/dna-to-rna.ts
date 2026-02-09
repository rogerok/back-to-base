type Dna = "A" | "C" | "G" | "T";
type Rna = "A" | "C" | "G" | "U";

const map: Record<Dna, Rna> = {
  A: "U",
  C: "G",
  G: "C",
  T: "A",
} as const;

export default function dnaToRna(dna: string) {
  if (!dna) return dna;

  let rna = "";

  for (let i = 0; i < dna.length; i++) {
    const nucleotide = dna[i];

    if (!Object.hasOwn(map, nucleotide)) {
      return null;
    }

    rna += map[nucleotide as keyof typeof map];
  }

  return rna;
}
