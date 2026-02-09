import { buildQueryString } from "./index.ts";

describe("buildQueryString (advanced)", () => {
  test("serializes flat primitives", () => {
    expect(buildQueryString({ page: 1, per: 10 })).toBe("page=1&per=10");
  });

  test("sorts keys alphabetically", () => {
    expect(buildQueryString({ a: 2, m: 3, z: 1 })).toBe("a=2&m=3&z=1");
  });

  test("serializes boolean values", () => {
    expect(buildQueryString({ draft: false, published: true })).toBe("draft=false&published=true");
  });

  test("serializes arrays as repeated keys", () => {
    expect(buildQueryString({ tags: ["js", "ts", "react"] })).toBe("tags=js&tags=ts&tags=react");
  });

  test("serializes mixed primitives and arrays", () => {
    expect(buildQueryString({ page: 1, tags: ["a", "b"] })).toBe("page=1&tags=a&tags=b");
  });

  test("serializes nested objects using bracket notation", () => {
    expect(buildQueryString({ user: { age: 30, name: "John" } })).toBe(
      "user[age]=30&user[name]=John",
    );
  });

  test("serializes arrays of objects", () => {
    expect(
      buildQueryString({
        filters: [
          { key: "status", value: "active" },
          { key: "role", value: "admin" },
        ],
      }),
    ).toBe(
      "filters[0][key]=status&filters[0][value]=active&filters[1][key]=role&filters[1][value]=admin",
    );
  });

  test("handles deeply nested structures deterministically", () => {
    expect(
      buildQueryString({
        a: {
          b: {
            c: [1, 2],
          },
        },
      }),
    ).toBe("a[b][c]=1&a[b][c]=2");
  });

  test("ignores undefined values", () => {
    expect(buildQueryString({ a: 1, b: undefined })).toBe("a=1");
  });

  test("returns empty string for empty object", () => {
    expect(buildQueryString({})).toBe("");
  });
});
