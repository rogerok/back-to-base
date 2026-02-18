import { describe, expect, it } from "vitest";

describe("unsound", () => {
  it("mutable array covariance is unsound", () => {
    const arrWithString: string[] = ["First", "Second", "Third"];

    const mixedArr: (number | string)[] = arrWithString;

    mixedArr.push(1);

    expect(() => arrWithString[3].toUpperCase()).toThrowError();
  });

  it("array out-of-bounds access is unsound", () => {
    const arrWithString: string[] = ["First", "Second", "Third"];

    const string: string = arrWithString[4];

    expect(() => string.toUpperCase()).toThrowError();
  });

  it("type variance", () => {
    const changeWidth = (arg: { width: number | string }) => {
      arg.width = "100px";
    };

    const obj: { width: number } = { width: 404 };
    changeWidth(obj);

    expect(() => obj.width.toFixed()).toThrowError();
  });

  it("type guard", () => {
    interface Common {
      name: string;
      role: "admin" | "user";
    }

    interface User extends Common {
      age: number;
      name: string;
      role: "user";
    }

    interface Admin extends Common {
      adminNumberField: number;
      name: string;
      role: "admin";
    }

    type SystemUser = Admin | User;

    function getUser(): SystemUser {
      return {
        age: 23,
        name: "user",
        role: "user",
      };
    }

    const isAdmin = (obj: SystemUser): obj is Admin => {
      return obj.role === "user";
    };

    expect(() => {
      const user = getUser();
      if (isAdmin(user)) {
        user.adminNumberField.toFixed();
      }
    }).toThrow();
  });

  it("function throws error", () => {
    const fnTrowError = (bool: boolean): string => {
      if (bool) {
        throw new Error("I am an error");
      }

      return "I am string";
    };

    expect(() => fnTrowError(true).toUpperCase()).toThrow();
  });

  it("spread unsound", () => {
    const o1: { p: string; q: number } = { p: "", q: 0 };
    const o2: { p: string } = o1;
    const o3: { p: string; q: string } = { q: "", ...o2 };

    expect(() => o3.q.toUpperCase()).toThrow();
  });

  it("record unsound", () => {
    const a: Record<string, string> = {};
    const b: Record<"k", string> = a;

    const bk: string = b.k;

    expect(() => bk.toUpperCase()).toThrow();
  });

  it("spread with computed key", () => {
    const a = { b: "hello" };
    const key: string = "hello";
    const b: Record<string, string> = { ...a, [key]: undefined };

    expect(() => b[key].toUpperCase()).toThrow();
  });

  it("union type with in operator", () => {
    type Union = { first: string; second: string } | { fourth: number; third: number };

    const union: Union = { first: "a", fourth: 4, third: 3 };

    if ("first" in union) {
      expect(() => union.second.toUpperCase()).toThrow();
    }
  });

  it("spread operators and accessors", () => {
    function useObj(obj: { bar: number; foo: string }): string {
      return obj.foo;
    }

    interface Inter {
      foo: string;
      spam: number;
    }

    class C implements Inter {
      get foo() {
        return "foo string";
      }

      get spam() {
        return 42;
      }
    }

    function doWork(c: Inter) {
      return useObj({ ...c, bar: c.spam });
    }

    expect(() => doWork(new C()).toUpperCase()).toThrow();
  });
});
