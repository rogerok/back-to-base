import { describe, expect, it } from "vitest";

import { Maybe } from "./containers.ts";
import { getAge, getAgeWrong, getCity, getConfigValue, getFirstFriendEmail } from "./exercise-2.ts";

describe("exercise-2.ts", () => {
  it("getCity", () => {
    expect(getCity({ address: { city: "Москва" } })).toBe("Москва");
    expect(getCity({ address: {} })).toBe("Город не указан");
    expect(getCity({ name: "Иван" })).toBe("Город не указан");
    expect(getCity(null)).toBe("Город не указан");
    expect(getCity({ address: null })).toBe("Город не указан");
    expect(getCity({ address: { city: undefined } })).toBe("Город не указан");
  });

  it("getFirstFriendEmail", () => {
    expect(getFirstFriendEmail({ friends: [{ email: "alice@mail.com" }] })).toBe("alice@mail.com");
    expect(getFirstFriendEmail({ friends: [{ name: "Боб" }] })).toBe("Email не найден");
    expect(getFirstFriendEmail({ friends: [] })).toBe("Email не найден");
    expect(getFirstFriendEmail({})).toBe("Email не найден");
    expect(
      getFirstFriendEmail({
        friends: [{ email: "first@mail.com" }, { email: "second@mail.com" }],
      }),
    ).toBe("first@mail.com");
  });

  it("getConfigValue", () => {
    const cfg = { db: { host: { name: "localhost" }, port: 5432 }, debug: true };
    expect(getConfigValue(cfg, "db", "host", "name")).toBe("localhost");
    expect(getConfigValue(cfg, "db", "port")).toBe(5432);
    expect(getConfigValue(cfg, "debug")).toBe(true);
    expect(getConfigValue(cfg, "api")).toBeNull();
    expect(getConfigValue(cfg, "db", "password")).toBeNull();
    expect(getConfigValue(null, "db")).toBeNull();
    expect(getConfigValue(cfg)).toBe(cfg);
  });

  it("map vs chain", () => {
    const wrongResult = getAgeWrong({ age: 25 });
    expect(wrongResult).toBeInstanceOf(Maybe);
    expect(wrongResult._value).toBeInstanceOf(Maybe);
    expect((wrongResult._value as Maybe<unknown>)._value).toBe(25);
    expect(getAge({ age: 25 })).toBe(25);
    expect(getAge({ age: 0 })).toBe(0);
    expect(getAge({})).toBe(0);
    expect(getAge(null)).toBe(0);
  });
});
