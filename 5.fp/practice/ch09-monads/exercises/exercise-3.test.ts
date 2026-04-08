import { describe, expect, it } from "vitest";

import { firstErrorWins, registerUser, validateEmail, validatePassword, validateUsername } from "./exercise-3.ts";
import { foldEither } from "./test-helpers.ts";

describe("exercise-3.ts", () => {
  it("validateUsername", () => {
    expect(foldEither(validateUsername({ username: "alice42", password: "", email: "" }))).toBe("RIGHT");
    expect(foldEither(validateUsername({ username: "ab", password: "", email: "" }))).toBe(
      "LEFT:Имя пользователя должно содержать от 3 до 20 символов",
    );
    expect(foldEither(validateUsername({ username: "a".repeat(21), password: "", email: "" }))).toBe(
      "LEFT:Имя пользователя должно содержать от 3 до 20 символов",
    );
    expect(foldEither(validateUsername({ username: "user!", password: "", email: "" }))).toBe(
      "LEFT:Имя пользователя должно содержать только буквы и цифры",
    );
    expect(foldEither(validateUsername({ username: 42, password: "", email: "" }))).toBe(
      "LEFT:Имя пользователя должно быть строкой",
    );
    expect(foldEither(validateUsername({ username: "Алиса", password: "", email: "" }))).toBe("RIGHT");
    expect(foldEither(validateUsername({ username: "ali", password: "", email: "" }))).toBe("RIGHT");
    expect(foldEither(validateUsername({ username: "a".repeat(20), password: "", email: "" }))).toBe("RIGHT");
  });

  it("validatePassword", () => {
    expect(foldEither(validatePassword({ username: "", password: "secret42", email: "" }))).toBe("RIGHT");
    expect(foldEither(validatePassword({ username: "", password: "sec1", email: "" }))).toBe(
      "LEFT:Пароль должен содержать минимум 8 символов",
    );
    expect(foldEither(validatePassword({ username: "", password: "secretsecret", email: "" }))).toBe(
      "LEFT:Пароль должен содержать хотя бы одну цифру",
    );
    expect(foldEither(validatePassword({ username: "", password: "12345678", email: "" }))).toBe(
      "LEFT:Пароль должен содержать хотя бы одну букву",
    );
    expect(foldEither(validatePassword({ username: "", password: 12345678, email: "" }))).toBe(
      "LEFT:Пароль должен быть строкой",
    );
    expect(foldEither(validatePassword({ username: "", password: "secret4!", email: "" }))).toBe("RIGHT");
  });

  it("validateEmail", () => {
    expect(foldEither(validateEmail({ username: "", password: "", email: "user@mail.ru" }))).toBe("RIGHT");
    expect(foldEither(validateEmail({ username: "", password: "", email: "usermail.ru" }))).toBe(
      "LEFT:Email должен содержать @",
    );
    expect(foldEither(validateEmail({ username: "", password: "", email: "user@nodot" }))).toBe(
      "LEFT:Email должен содержать точку после @",
    );
    expect(foldEither(validateEmail({ username: "", password: "", email: 42 }))).toBe(
      "LEFT:Email должен быть строкой",
    );
  });

  it("registerUser", () => {
    const valid = registerUser({ username: "alice", password: "secret42", email: "alice@mail.ru" });
    expect(valid.success).toBe(true);
    expect("user" in valid && valid.user).toBeTruthy();

    const badUsername = registerUser({ username: "al", password: "secret42", email: "alice@mail.ru" });
    expect(badUsername.success).toBe(false);
    expect("error" in badUsername && badUsername.error.includes("пользователя")).toBe(true);

    const badPassword = registerUser({ username: "alice", password: "short", email: "alice@mail.ru" });
    expect(badPassword.success).toBe(false);
    expect("error" in badPassword && badPassword.error.includes("Пароль")).toBe(true);

    const badEmail = registerUser({ username: "alice", password: "secret42", email: "invalid" });
    expect(badEmail.success).toBe(false);
    expect("error" in badEmail && badEmail.error.includes("Email")).toBe(true);
  });

  it("firstErrorWins", () => {
    expect(firstErrorWins({ username: "a", password: "nope11", email: "bad" })).toBe("username");
    expect(firstErrorWins({ username: "alice", password: "nope", email: "bad" })).toBe("password");
    expect(firstErrorWins({ username: "alice", password: "secret42", email: "bad" })).toBe("email");
    expect(firstErrorWins({ username: "alice", password: "secret42", email: "a@b.ru" })).toBe("ok");
  });
});
