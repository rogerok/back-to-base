export class FetchError extends Error {
  readonly _tag = "FetchError";
  constructor(
    readonly url: string,
    readonly cause: unknown,
  ) {
    super();
  }
}

export class HttpError extends Error {
  readonly _tag = "HttpError";
  constructor(
    readonly status: number,
    readonly url: string,
  ) {
    super();
  }
}
export class ParseError extends Error {
  readonly _tag = "ParseError";
  constructor(readonly cause: string) {
    super();
  }
}
