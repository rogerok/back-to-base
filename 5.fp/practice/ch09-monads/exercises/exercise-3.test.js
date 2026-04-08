import { describe, expect, it } from "vitest";

import { firstErrorWins, registerUser, validateEmail, validatePassword, validateUsername } from "./exercise-3.js";
import { foldEither } from "./test-helpers.js";

describe("exercise-3.js", () => {
  it("validateUsername", () => {
    expect(foldEither(validateUsername({ username: "alice42" }))).toBe("RIGHT");
    expect(foldEither(validateUsername({ username: "ab" }))).toBe(
      "LEFT:Имя пользователя должно содержать от 3 до 20 символов",
    );
    expect(foldEither(validateUsername({ username: "a".repeat(21) }))).toBe(
      "LEFT:Имя пользователя должно содержать от 3 до 20 символов",
    );
    expect(foldEither(validateUsername({ username: "user!" }))).toBe(
      "LEFT:Имя пользователя должно содержать только буквы и цифры",
    );
    expect(foldEither(validateUsername({ username: 42 }))).toBe("LEFT:Имя пользователя должно быть строкой");
    expect(foldEither(validateUsername({ username: "Алиса" }))).toBe("RIGHT");
    expect(foldEither(validateUsername({ username: "ali" }))).toBe("RIGHT");
    expect(foldEither(validateUsername({ username: "a".repeat(20) }))).toBe("RIGHT");
  });

  it("validatePassword", () => {
    expect(foldEither(validatePassword({ password: "secret42" }))).toBe("RIGHT");
    expect(foldEither(validatePassword({ password: "sec1" }))).toBe(
      "LEFT:Пароль должен содержать минимум 8 символов",
    );
    expect(foldEither(validatePassword({ password: "secretsecret" }))).toBe(
      "LEFT:Пароль должен содержать хотя бы одну цифру",
    );
    expect(foldEither(validatePassword({ password: "12345678" }))).toBe(
      "LEFT:Пароль должен содержать хотя бы одну букву",
    );
    expect(foldEither(validatePassword({ password: 12345678 }))).toBe("LEFT:Пароль должен быть строкой");
    expect(foldEither(validatePassword({ password: "secret4!" }))).toBe("RIGHT");
  });

  it("validateEmail", () => {
    expect(foldEither(validateEmail({ email: "user@mail.ru" }))).toBe("RIGHT");
    expect(foldEither(validateEmail({ email: "usermail.ru" }))).toBe("LEFT:Email должен содержать @");
    expect(foldEither(validateEmail({ email: "user@nodot" }))).toBe("LEFT:Email должен содержать точку после @");
    expect(foldEither(validateEmail({ email: 42 }))).toBe("LEFT:Email должен быть строкой");
  });

  it("registerUser", () => {
    const valid = registerUser({ username: "alice", password: "secret42", email: "alice@mail.ru" });
    expect(valid.success).toBe(true);
    expect(Boolean(valid.user)).toBe(true);

    const badUsername = registerUser({ username: "al", password: "secret42", email: "alice@mail.ru" });
    expect(badUsername.success).toBe(false);
    expect(badUsername.error.includes("пользователя")).toBe(true);

    const badPassword = registerUser({ username: "alice", password: "short", email: "alice@mail.ru" });
    expect(badPassword.success).toBe(false);
    expect(badPassword.error.includes("Пароль")).toBe(true);

    const badEmail = registerUser({ username: "alice", password: "secret42", email: "invalid" });
    expect(badEmail.success).toBe(false);
    expect(badEmail.error.includes("Email")).toBe(true);
  });

  it("firstErrorWins", () => {
    expect(firstErrorWins({ username: "a", password: "nope11", email: "bad" })).toBe("username");
    expect(firstErrorWins({ username: "alice", password: "nope", email: "bad" })).toBe("password");
    expect(firstErrorWins({ username: "alice", password: "secret42", email: "bad" })).toBe("email");
    expect(firstErrorWins({ username: "alice", password: "secret42", email: "a@b.ru" })).toBe("ok");
  });
});
