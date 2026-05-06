class FetchError {
  readonly _tag = "FetchError";
  constructor(
    readonly url: string,
    readonly cause: unknown,
  ) {}
}

class HttpError {
  readonly _tag = "HttpError";
  constructor(
    readonly status: number,
    readonly url: string,
  ) {}
}
