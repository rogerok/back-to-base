export type Status = "error" | "success";

export interface ResponseBase {
  code: number;
  status: Status;
  url: string;
}

export interface ResponseSuccess<T = unknown> extends ResponseBase {
  data: T;
  status: "success";
  url: string;
}

export interface ResponseError extends ResponseBase {
  error: any;
  status: "error";
  url: string;
}

export type ResponseType<T> = ResponseError | ResponseSuccess<T>;
