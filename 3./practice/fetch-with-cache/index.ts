import { LRUCache } from "./lru-cache.ts";

const sleep = (ms: number, signal: AbortSignal) => {
  return new Promise((resolve, reject) => {
    const id = setTimeout(resolve, ms);

    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(id);
        reject(signal);
      },
      {
        once: true,
      },
    );
  });
};

const shouldRetry = (code: number): boolean => code >= 500;
const shouldNotRetry = (code: number): boolean => code >= 400 && code <= 500;

type Status = "error" | "success";

interface ResponseBase {
  status: Status;
  url: string;
}

interface ResponseSuccess<T = unknown> extends ResponseBase {
  data: T;
  status: "success";
  url: string;
}

interface ResponseError extends ResponseBase {
  error: any;
  status: "error";
  url: string;
}

type ResponseType<T> = ResponseError | ResponseSuccess<T>;

// TODO: maybe store also fail request and make retry for them?
const createCache = <T>(maxSize: number = 10) =>
  new LRUCache<string, ResponseSuccess<T>>({
    maxSize: maxSize,
  });

const cache = createCache<{ id: string }>();

export const fetchWithCache = async <T>(
  urls: string[],
  timeout = 10_000,
): Promise<(ResponseError | ResponseSuccess<T>)[]> => {
  const cache = createCache<T>();
  const abortController = new AbortController();
  const urlsToHandle: string[] = [];

  const response: ResponseSuccess<T>[] = [];

  if (cache.size) {
    urls.forEach((url) => {
      const item = cache.get(url);
      if (item) {
        response.push(item);
        return;
      }

      urlsToHandle.push(url);
    });
  }

  const fetchSingle = async (url: string) => {
    const resp = await fetch(url, {
      signal: abortController.signal,
    });

    if (resp.ok) {
      const json = await resp.json();
      const data = {
        data: json,
        status: "success",
        url: url,
      };

      response.push(data as ResponseSuccess<T>);
      cache.set(url, data as ResponseSuccess<T>);

      return;
    }

    if (shouldNotRetry(resp.status)) {
      abortController.abort();
    }
  };

  const makeFn = (url: string, signal: AbortSignal) => {
    return () =>
      fetch(url, {
        method: "GET",
        signal: signal,
      });
  };

  return response;
};
