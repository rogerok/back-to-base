import { LRUCache } from "./lru-cache.ts";

const TIMEOUT = 3000;
const BASE_DELAY = 200;

export function exponentialBackoffWithJitter(
  attempt: number,
  baseDelay = BASE_DELAY,
  maxDelay = TIMEOUT,
): number {
  const exponentialDelay = baseDelay * 2 ** attempt;

  const cappedDelay = Math.min(exponentialDelay, maxDelay);

  return Math.random() * cappedDelay;
}

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
  // const cache = createCache<T>();
  const abortController = new AbortController();
  const urlsToHandle: string[] = [];

  const response: ResponseSuccess<T>[] = [];

  urls.forEach((url) => {
    const item = cache.get(url);
    if (item) {
      response.push(item);
      return;
    }

    urlsToHandle.push(url);
  });

  abortController.signal.addEventListener("abort", () => {
    console.log("aborted");
  });

  const fetchSingle = async (url: string) => {
    let shouldLoop = true;
    let resp;

    const fetchFn = async () => {
      resp = await fetch(url, {
        signal: abortController.signal,
      });

      if (resp.ok) {
        const json = await resp.json();
        const data = {
          data: json,
          status: "success",
          url: url,
        };

        shouldLoop = false;

        response.push(data as ResponseSuccess<T>);
        cache.set(url, data as ResponseSuccess<{ id: string }>);
        return;
      }
    };

    //   retry
    if (shouldRetry(resp.status)) {
      let attempt = 1;

      let retryDelay = exponentialBackoffWithJitter(attempt, 1000);
      let totalTime = retryDelay;

      while (shouldLoop) {
        retryDelay = exponentialBackoffWithJitter(attempt);

        if (totalTime >= timeout) {
          abortController.abort();
          break;
        }

        console.time("sleep");
        await sleep(retryDelay, abortController.signal);

        attempt += 1;
        totalTime += retryDelay;

        console.log("try = ", attempt, url);

        console.timeEnd("sleep");
      }
    }

    // Abort all requests

    if (!shouldRetry(resp.status)) {
      abortController.abort();
    }
  };

  await Promise.allSettled(
    urlsToHandle.map(async (url) => {
      await fetchSingle(url);
    }),
  );

  return response;
};

await (async () =>
  await fetchWithCache([
    "https://dummyjson.com/products/1",
    "https://dummyjson.com/products/2",
    "https://dummyjson.com/http/500",
  ]))();
