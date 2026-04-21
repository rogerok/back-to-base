// Task 10: Full composition — ReaderTaskEither
// Combine Reader (DI) + Task (async) + Either (errors) into ReaderTaskEither
// This is the pattern used in real fp-ts applications

interface DbConfig {
  connectionString: string;
}

interface EmailService {
  send: (to: string, subject: string, body: string) => Promise<void>;
}

interface AppEnv {
  db: DbConfig;
  email: EmailService;
  logger: { log: (msg: string) => void };
}

interface User {
  id: number;
  email: string;
  name: string;
  isPremium: boolean;
}

type AppError =
  | { type: 'DbError'; message: string }
  | { type: 'NotFound'; message: string }
  | { type: 'EmailError'; message: string }
  | { type: 'ForbiddenError'; message: string };

// Simulated DB
const db: User[] = [
  { id: 1, email: 'alice@example.com', name: 'Alice', isPremium: true },
  { id: 2, email: 'bob@example.com',   name: 'Bob',   isPremium: false },
];

async function sendWelcomeEmail(
  env: AppEnv,
  userId: number
): Promise<string | AppError> {
  // 1. Find user
  let user: User | undefined;
  try {
    user = db.find(u => u.id === userId);
  } catch (e) {
    return { type: 'DbError', message: (e as Error).message };
  }

  if (!user) {
    return { type: 'NotFound', message: `User ${userId} not found` };
  }

  // 2. Check premium
  if (!user.isPremium) {
    return { type: 'ForbiddenError', message: 'Welcome email only for premium users' };
  }

  // 3. Send email
  try {
    await env.email.send(
      user.email,
      'Welcome to Premium!',
      `Hi ${user.name}, thanks for upgrading!`
    );
    env.logger.log(`Welcome email sent to ${user.email}`);
    return `Email sent to ${user.email}`;
  } catch (e) {
    return { type: 'EmailError', message: (e as Error).message };
  }
}

const appEnv: AppEnv = {
  db: { connectionString: 'postgresql://localhost:5432/app' },
  email: {
    send: async (to, subject, body) => {
      console.log(`[EMAIL] To: ${to} | Subject: ${subject} | Body: ${body}`);
    },
  },
  logger: { log: console.log },
};

sendWelcomeEmail(appEnv, 1).then(console.log);  // Email sent
sendWelcomeEmail(appEnv, 2).then(console.log);  // ForbiddenError
sendWelcomeEmail(appEnv, 99).then(console.log); // NotFound
