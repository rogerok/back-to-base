import { BASE_DELAY, MAX_DELAY } from "./constants.ts";
import { LRUCache } from "./lru-cache.ts";
import { ResponseError, ResponseSuccess, ResponseType } from "./types.ts";

const exponentialBackoffWithJitter = (
  attempt: number,
  baseDelay = BASE_DELAY,
  maxDelay = MAX_DELAY,
): number => {
  const exponentialDelay = baseDelay * 2 ** attempt;

  const cappedDelay = Math.min(exponentialDelay, maxDelay);

  return Math.random() * cappedDelay;
};

const fetchFn = async <T>(url: string, signal: AbortSignal): Promise<ResponseType<T>> => {
  try {
    const resp = await fetch(url, {
      signal: signal,
    });

    if (resp.ok) {
      const json = await resp.json();
      return {
        code: resp.status,
        data: json as T,
        status: "success",
        url: url,
      };
    } else {
      return {
        code: resp.status,
        error: resp.statusText,
        status: "error",
        url: url,
      };
    }
  } catch (e) {
    return {
      code: 0,
      error: e,
      status: "error",
      url: url,
    };
  }
};

const sleep = (ms: number, signal: AbortSignal) => {
  return new Promise((resolve, reject) => {
    const id = setTimeout(resolve, ms);

    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(id);
        reject(new Error(String(signal.reason)));
      },
      {
        once: true,
      },
    );
  });
};

const shouldRetry = (code: number): boolean => code >= 500;
const shouldNotRetry = (code: number): boolean => code >= 400 && code < 500;

const createCache = <T>(maxSize: number = 10) =>
  new LRUCache<string, ResponseSuccess<T>>({
    maxSize: maxSize,
  });

const cache = createCache<ResponseSuccess<{ id: string }>>();

export const fetchWithCache = async <T>(
  urls: string[],
  cache: LRUCache<string, ResponseSuccess<T>>,
  timeout = MAX_DELAY,
  maxRetry = 5,
): Promise<(ResponseError | ResponseSuccess<T>)[]> => {
  const abortController = new AbortController();
  const urlsToHandle: { idx: number; url: string }[] = [];
  const response: ResponseType<T>[] = [];

  urls.forEach((url, idx) => {
    const item = cache.get(url);
    if (item) {
      response[idx] = item;
    } else {
      urlsToHandle.push({
        idx: idx,
        url: url,
      });
    }
  });

  const fetchSingle = async (url: string, idx: number) => {
    let resp = await fetchFn<T>(url, abortController.signal);

    const processSuccess = (resp: ResponseSuccess<T>): void => {
      response[idx] = {
        code: resp.code,
        data: resp.data,
        status: resp.status,
        url: url,
      };

      cache.set(url, {
        code: resp.code,
        data: resp.data,
        status: resp.status,
        url: url,
      });
    };

    const processFailure = (err: ResponseError): void => {
      response[idx] = {
        code: err.code,
        error: err.error,
        status: "error",
        url: url,
      };
    };

    if (resp.status === "success") {
      processSuccess(resp);
    }

    //   retry
    if (shouldRetry(resp.code)) {
      let attempt = 1;

      while (true) {
        if (attempt > maxRetry) {
          processFailure({
            code: 500,
            error: "Max retry reached",
            status: "error",
            url: url,
          });
          break;
        }

        const retryDelay = exponentialBackoffWithJitter(attempt);

        try {
          await sleep(retryDelay, abortController.signal);
        } catch (e) {
          processFailure({
            code: 500,
            error: "TIMEOUT",
            status: "error",
            url: url,
          });

          throw e;
        }

        resp = await fetchFn<T>(url, abortController.signal);

        if (resp.status === "success") {
          processSuccess(resp);
          break;
        }

        if (shouldNotRetry(resp.code)) {
          processFailure(resp);
          abortController.abort();
          break;
        }

        attempt += 1;
      }
    }

    if (shouldNotRetry(resp.code)) {
      abortController.abort();

      if (resp.status === "error") {
        processFailure(resp);
      }
    }
  };

  const timeoutId = setTimeout(() => {
    abortController.abort();
  }, timeout);

  await Promise.allSettled(
    urlsToHandle.map(async (item) => {
      await fetchSingle(item.url, item.idx);
    }),
  ).finally(() => {
    clearTimeout(timeoutId);
  });

  return response;
};

const resp = await fetchWithCache(
  [
    "https://dummyjson.com/products/1",
    "https://dummyjson.com/products/2",
    "https://dummyjson.com/products/3",
    "https://dummyjson.com/http/500",
  ],
  cache,
);

const resp2 = await fetchWithCache(
  [
    "https://dummyjson.com/products/2",

    "https://dummyjson.com/products/3",
    "https://dummyjson.com/products/4",
  ],
  cache,
);
