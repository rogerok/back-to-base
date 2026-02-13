import { cssTagged } from "../index.ts";
import { color, space, ThemeType } from "../theme.ts";

/*
  Doesn't work
  height: calc(100% - ${space}px);
  min-height: ${(theme: ThemeType) => theme.spacing * 10}px;
  max-width: ${space * 10}px;

 */

const expectedStyleObject = {
  alignItems: "center",
  backgroundColor: "red",
  borderColor: "blue",

  borderStyle: "solid dashed dotted double",
  borderTopLeftRightBottomWidth: "8px",
  borderWidth: "8px 8px 8px 8px",
  boxShadow: "0 0 8px rgba(0, 0, 0, 0.2)",

  color: "blue",
  display: "flex",
  flexDirection: "column",

  justifyContent: "space-between",
  marginBottom: "8px 16px 24px",
  marginLeftRightTopBottom: "1px 2px 3px 4px",

  marginTop: "10px 20px",

  minWidth: "10rem",
  outlineColor: "blue",
  paddingBottom: "8px",

  paddingLeft: "16px",
  paddingRight: "8px",

  paddingTop: "10px",

  transitionDuration: "200ms",
  transitionProperty: "opacity transform background-color",
  transitionTimingFunction: "ease-in-out",

  width: "100%",
};

describe("Tagged Template", () => {
  it("return correctly", () => {
    expect(cssTagged`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;

  padding-top: 10;
  padding-bottom: ${space}px;
  padding-left: ${space * 2}px;
  padding-right: ${space}px;

  margin-top: 10px 20px;
  margin-bottom: ${space}px ${space * 2}px ${space * 3}px;
  margin-left-right-top-bottom: 1px 2px 3px 4px;

  border-width: ${space}px ${space}px ${space}px ${space}px;
  border-style: solid dashed dotted double;
  border-top-left-right-bottom-width: ${space}px;
  border-color: ${(theme: ThemeType) => theme.color};

  background-color: ${color};
  color: ${(theme: ThemeType) => theme.color};
  outline-color: ${(theme: ThemeType) => theme.color};

  width: 100%;
  min-width: 10rem;


  box-shadow: 0 0 ${space}px rgba(0, 0, 0, 0.2);

  transition-property: opacity transform background-color;
  transition-duration: 200ms;
  transition-timing-function: ease-in-out;

`).toEqual(expectedStyleObject);
  });
});

describe("Tagged Template – big stress test (no calc, no math)", () => {
  it("should correctly handle complex mixed css without calc and multiplications", () => {
    expect(
      cssTagged`
        --custom-var: 0 ${space}px ${(theme: ThemeType) => theme.spacing}px;
      
        align-items: center;
      
        border-color: ${(theme: ThemeType) => theme.color};
        border-style: solid dashed dotted double;
        border-width: ${space}px ${space}px ${space}px ${space}px;
      
        box-shadow: 0 0 ${space}px rgba(0, 0, 0, 0.2);
      
        display: flex;
        flex-direction: column;
      
        gap: ${space}px ${space}px;
      
        height: 100px;
        justify-content: space-between;
      
        margin: ${space}px   ${space}px;
      
        min-width: 10rem;
      
        padding: 0 ${space}px;
        min-height: ${(theme: ThemeType) => theme.spacing * 5}px;
        max-width: ${space * 10}px;
        transition-duration: 200ms;
        transition-property: opacity transform background-color;
        transition-timing-function: ease-in-out;
      
        width: 100%;
`,
    ).toEqual({
      "--custom-var": "0 8px 4px",
      alignItems: "center",
      borderColor: "blue",
      borderStyle: "solid dashed dotted double",

      borderWidth: "8px 8px 8px 8px",
      boxShadow: "0 0 8px rgba(0, 0, 0, 0.2)",
      display: "flex",
      flexDirection: "column",
      gap: "8px 8px",

      height: "100px",
      justifyContent: "space-between",

      margin: "8px 8px",
      maxWidth: "80px",

      minHeight: "20px",
      minWidth: "10rem",

      padding: "0 8px",

      transitionDuration: "200ms",
      transitionProperty: "opacity transform background-color",
      transitionTimingFunction: "ease-in-out",

      width: "100%",
    });
  });
});
