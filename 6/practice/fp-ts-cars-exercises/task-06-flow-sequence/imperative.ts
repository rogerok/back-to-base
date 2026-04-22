// Task 6: flow + NonEmptyArray.map + sequence
//
// В задании от ментора runGame = flow(NonEmptyArray.map(playRound), RTE.sequenceSeqArray)
// превращал массив раундов в массив эффектов, а потом sequenceSeqArray выполнял их по очереди.
// Здесь — аналогичная задача с TaskEither вместо RTE (проще, без Reader).
//
// Перепиши используя:
// - flow для композиции
// - NonEmptyArray.map для маппинга
// - TE.sequenceSeqArray для последовательного выполнения
// - TE.tryCatch для оборачивания async

interface EmailResult {
  to: string;
  success: boolean;
  message: string;
}

// Имитация отправки email
async function sendEmail(to: string, body: string): Promise<EmailResult> {
  // Имитируем задержку
  await new Promise((r) => setTimeout(r, 10));

  if (!to.includes("@")) {
    throw new Error(`Invalid email: ${to}`);
  }

  return { to, success: true, message: `Sent "${body}" to ${to}` };
}

async function sendBulkEmails(
  recipients: string[],
  body: string,
): Promise<EmailResult[]> {
  const results: EmailResult[] = [];

  for (const to of recipients) {
    try {
      const result = await sendEmail(to, body);
      results.push(result);
    } catch (e) {
      results.push({
        to,
        success: false,
        message: (e as Error).message,
      });
    }
  }

  return results;
}

export { sendEmail, sendBulkEmails };
export type { EmailResult };
