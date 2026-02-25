import { TokenSpec, TokenTypesValuesType } from "./constants.ts";

export interface ParsedToken {
  type: TokenTypesValuesType;
  value: string;
}

export class Tokenizer {
  pointer = 0;

  constructor(public input: string) {}

  hasMoreTokens = () => {
    return this.pointer < this.input.length;
  };

  match = (regexp: RegExp, inputSlice: string) => {
    const matched = regexp.exec(inputSlice);

    if (matched === null) {
      return null;
    }

    this.pointer += matched[0].length;

    return matched[0];
  };

  getNextToken = (): ParsedToken | null => {
    if (!this.hasMoreTokens()) {
      return null;
    }

    const inputSlice = this.input.slice(this.pointer);

    for (const [regexp, type] of TokenSpec) {
      const tokenValue = this.match(regexp, inputSlice);

      if (tokenValue === null) {
        continue;
      }

      if (type === null) {
        return this.getNextToken();
      }

      return {
        type,
        value: tokenValue,
      };
    }
    throw new SyntaxError(`Unexpected token: "${inputSlice[0]}"`);
  };
}
