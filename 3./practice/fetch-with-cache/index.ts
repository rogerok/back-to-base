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

const fetchFn = async <T>(url: string, signal: AbortSignal): Promise<ResponseType<T>> => {
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
};

const sleep = (ms: number, signal: AbortSignal) => {
  return new Promise((resolve, reject) => {
    const id = setTimeout(resolve, ms);

    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(id);
        reject(signal.reason);
      },
      {
        once: true,
      },
    );
  });
};

const shouldRetry = (code: number): boolean => code >= 500;
const shouldNotRetry = (code: number): boolean => code >= 400 && code < 500;

type Status = "error" | "success";

interface ResponseBase {
  code: number;
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
  const abortController = new AbortController();
  const urlsToHandle: { idx: number; url: string }[] = [];
  const response: ResponseType<T>[] = [];

  urls.forEach((url, idx) => {
    const item = cache.get(url);
    if (item) {
      response.push(item);
      return;
    }

    urlsToHandle.push({
      idx: idx,
      url: url,
    });
  });

  abortController.signal.addEventListener("abort", () => {
    console.log("aborted");
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
        data: resp.data as unknown as T,
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

      let totalTime = 0;

      while (true) {
        const retryDelay = exponentialBackoffWithJitter(attempt);

        if (totalTime + retryDelay >= timeout) {
          abortController.abort();
          break;
        }

        console.time("retrying");
        try {
          await sleep(retryDelay, abortController.signal);
        } catch (e) {
          response[idx] = {
            code: 500,
            error: "TIMEOUT",
            status: "error",
            url: url,
          };
          throw e;
        }

        resp = await fetchFn<T>(url, abortController.signal);
        console.timeEnd("retrying");

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
        totalTime += retryDelay;
      }
    }

    // Abort all requests
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
  );

  return response;
};

const resp = await fetchWithCache([
  "https://dummyjson.com/products/1",
  "https://dummyjson.com/products/2",
  "https://dummyjson.com/http/500",
]);
