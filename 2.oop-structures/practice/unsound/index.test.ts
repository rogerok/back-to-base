import { describe, expect, it } from "vitest";

describe("unsound", () => {
  it("mutable array covariance is unsound", () => {
    const arrWithString: string[] = ["First", "Second", "Third"];

    const mixedArr: (number | string)[] = arrWithString;

    mixedArr.push(1);

    console.log(arrWithString);

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

  //
  // it("clears cache when clear() is called", () => {});
  //
  // it("evicts least recently used when cache is full", () => {});
  //
  // it("respects LRU order (recently used should survive)", () => {});
});
