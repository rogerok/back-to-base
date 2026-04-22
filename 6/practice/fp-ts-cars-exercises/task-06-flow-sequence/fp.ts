// Task 6: flow + NonEmptyArray.map + TE.sequenceSeqArray
//
// Перепиши используя fp-ts:
// - TE.tryCatch для оборачивания sendEmail
// - flow для композиции map + sequence
// - NonEmptyArray.map для маппинга в массив TE
// - TE.sequenceSeqArray для последовательного выполнения
//
// Результат: (recipients, body) => TE.TaskEither<Error, EmailResult[]>
// Важно: в отличие от императивной версии, при первой ошибке пайплайн останавливается (fail-fast).
// Это нормальное поведение для TE.sequenceSeqArray.

import { flow, pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import * as NEA from "fp-ts/NonEmptyArray";

interface EmailResult {
  to: string;
  success: boolean;
  message: string;
}

// Имитация отправки email (не менять)
const sendEmail = (to: string, body: string): Promise<EmailResult> =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!to.includes("@")) {
        reject(new Error(`Invalid email: ${to}`));
      } else {
        resolve({ to, success: true, message: `Sent "${body}" to ${to}` });
      }
    }, 10);
  });

// TODO: обёртка sendEmail в TaskEither
// const sendEmailTE = (to: string, body: string): TE.TaskEither<Error, EmailResult> =>
//   TE.tryCatch(() => sendEmail(to, body), (e) => e as Error)

// TODO: sendBulkEmails через flow(NEA.map(...), TE.sequenceSeqArray)
// const sendBulkEmails = (recipients: NEA.NonEmptyArray<string>, body: string) =>
//   pipe(
//     recipients,
//     NEA.map((to) => sendEmailTE(to, body)),
//     TE.sequenceSeqArray,
//   )
// Или через flow:
// const sendBulkEmails = (body: string) =>
//   flow(NEA.map((to: string) => sendEmailTE(to, body)), TE.sequenceSeqArray)

const sendBulkEmails = (
  recipients: NEA.NonEmptyArray<string>,
  body: string,
): TE.TaskEither<Error, readonly EmailResult[]> => {
  throw new Error("TODO");
};

export { sendEmail, sendBulkEmails };
export type { EmailResult };
