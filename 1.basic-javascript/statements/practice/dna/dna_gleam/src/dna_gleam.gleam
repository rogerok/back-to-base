import gleam/list
import gleam/bit_array

pub type Nucleotide {
  Adenine
  Cytosine
  Guanine
  Thymine
}

pub fn encode_nucleotide(acid: Nucleotide) -> BitArray
{
  case acid {
    Adenine -> <<00:2>>
    Cytosine -> <<01:2>>
    Guanine -> <<10:2>>
    Thymine -> <<11:2>>
  }
}

pub type DecodeError {
  CodeDoesNotExist
}

pub fn decode_nucliotide(val: Int) -> Result(Nucleotide, DecodeError)
{
  case val {
    0b00 -> Ok(Adenine)
    0b01 -> Ok(Cytosine)
    0b1010 -> Ok(Guanine)
    0b1011  -> Ok(Thymine)
    _ -> Error(CodeDoesNotExist)
  }
}

pub fn encode(dna: List(Nucleotide)) -> BitArray {
  bit_array.concat(list.map(dna, fn(v) {
    encode_nucleotide(v)
  }))
}

pub fn main() {

  echo encode([Adenine, Cytosine, Guanine, Thymine])
}