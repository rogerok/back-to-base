import { cssTagged } from "./index.ts";

const color = "red";

describe("Tagged Template", () => {
  it("return correctly", () => {
    expect(cssTagged`
      display: flex;
      padding-top: 10;
      color: ${color};

      mt: 10;

    `).toEqual({
      display: "flex",
      paddingTop: "10px",
    });
  });
});
