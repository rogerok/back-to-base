pub type Acid {
  Adenine
  Cytosine
  Guanine
  Thymine
}

pub fn greet(name: String) -> String {
  "Hello, " <> name
}


pub fn encode_nucleotide(acid: Acid) -> BitArray
{
  case acid {
    Adenine -> <<0b00>>
    Cytosine -> <<0b01>>
    Guanine -> <<0b1010>>
    Thymine -> <<0b1011>>
  }
}

pub type DecodeError {
  CodeDoesNotExist
}

pub fn decode_nucliotide(val: Int) -> Result(Acid, DecodeError)
{
  case val {
    0b00 -> Ok(Adenine)
    0b01 -> Ok(Cytosine)
    0b1010 -> Ok(Guanine)
    0b1011  -> Ok(Thymine)
    _ -> Error(CodeDoesNotExist)
  }
}

pub fn main() {
  echo encode_nucleotide(Adenine)
  echo encode_nucleotide(Cytosine)
  echo encode_nucleotide(Guanine)
  echo encode_nucleotide(Thymine)

  echo decode_nucliotide(00)
}
