import {
  decodeNucleotide,
  encode,
  encodeNucleotide,
  NucleotideMap,
  NucleotideValues,
} from "./index.js";

describe("DNA task; encodeNucleotide fn", () => {
  it("encode Adenine; should return 0", () => {
    expect(encodeNucleotide(NucleotideMap.Adenine)).toBe(NucleotideValues[NucleotideMap.Adenine]);
  });
  it("encode Cytosine; should return 01", () => {
    expect(encodeNucleotide(NucleotideMap.Cytosine)).toBe(NucleotideValues[NucleotideMap.Cytosine]);
  });
  it("encode Guanine; should return 10", () => {
    expect(encodeNucleotide(NucleotideMap.Guanine)).toBe(NucleotideValues[NucleotideMap.Guanine]);
  });
  it("encode Thymine; should return 11", () => {
    expect(encodeNucleotide(NucleotideMap.Thymine)).toBe(NucleotideValues[NucleotideMap.Thymine]);
  });
});

describe("DNA task; decodeNucleotide fn", () => {
  it("decode 0; should return Adenine", () => {
    expect(decodeNucleotide(NucleotideValues[NucleotideMap.Adenine])).toBe(NucleotideMap.Adenine);
  });
  it("decode 01; should return Cytosine", () => {
    expect(decodeNucleotide(NucleotideValues[NucleotideMap.Cytosine])).toBe(NucleotideMap.Cytosine);
  });
  it("decode 10; should return Guanine", () => {
    expect(decodeNucleotide(NucleotideValues[NucleotideMap.Guanine])).toBe(NucleotideMap.Guanine);
  });
  it("decode 11; should return Thymine", () => {
    expect(decodeNucleotide(NucleotideValues[NucleotideMap.Thymine])).toBe(NucleotideMap.Thymine);
  });
});

describe("DNA task; encode fn", () => {
  it("should return 27", () => {
    expect(
      encode([
        NucleotideMap.Adenine,
        NucleotideMap.Cytosine,
        NucleotideMap.Guanine,
        NucleotideMap.Thymine,
      ]),
    ).toBe(27);
  });
});
