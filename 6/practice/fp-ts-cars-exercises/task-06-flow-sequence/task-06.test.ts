import { describe, it, expect } from "vitest";
import * as E from "fp-ts/Either";
// Переключи импорт на "./fp" когда будешь готов проверить своё решение
import { sendBulkEmails, type EmailResult } from "./imperative";

describe("Task 6: flow + NEA.map + sequence", () => {
  it("sends to all valid recipients", async () => {
    const result = await runSendBulk(
      ["alice@test.com", "bob@test.com"],
      "Hello!",
    );

    const emails = unwrapResult(result);
    expect(emails).toHaveLength(2);
    expect(emails[0].to).toBe("alice@test.com");
    expect(emails[1].to).toBe("bob@test.com");
    expect(emails.every((e) => e.success)).toBe(true);
  });

  it("handles invalid email (imperative: catches, fp: fails fast)", async () => {
    const result = await runSendBulk(
      ["alice@test.com", "bad-email", "bob@test.com"],
      "Hi",
    );

    // Императивная версия: все результаты, включая ошибки
    // FP версия: Left при первой ошибке (fail-fast)
    if (isEither(result)) {
      // FP: должен быть Left
      expect(E.isLeft(result)).toBe(true);
    } else {
      // Imperative: должен содержать ошибку для bad-email
      const emails = result as EmailResult[];
      const bad = emails.find((e) => e.to === "bad-email");
      expect(bad?.success).toBe(false);
    }
  });
});

// Хелперы для совместимости imperative/fp версий
async function runSendBulk(recipients: string[], body: string) {
  const result = sendBulkEmails(recipients as any, body);
  // FP: TaskEither — вызов ()
  if (typeof result === "function") {
    return (result as () => Promise<unknown>)();
  }
  // Imperative: Promise
  return result;
}

function unwrapResult(result: unknown): EmailResult[] {
  if (isEither(result)) {
    if (E.isRight(result)) return result.right as EmailResult[];
    throw new Error("Unexpected Left");
  }
  return result as EmailResult[];
}

function isEither(x: unknown): x is E.Either<unknown, unknown> {
  return (
    typeof x === "object" &&
    x !== null &&
    "_tag" in x &&
    (x._tag === "Left" || x._tag === "Right")
  );
}
