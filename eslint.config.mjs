import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import perfectionist from "eslint-plugin-perfectionist";

export default [
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,

  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      perfectionist,
    },

    rules: {
      "@typescript-eslint/explicit-function-return-type": [
        "warn",
        {
          allowExpressions: true,
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "perfectionist/sort-enums": "warn",
      // Perfectionist sorting rules

      "perfectionist/sort-exports": "warn",

      "perfectionist/sort-imports": "warn",

      "perfectionist/sort-interfaces": [
        "warn",
        {
          groups: ["required-property", "optional-property"],
          order: "asc",
        },
      ],
      "perfectionist/sort-intersection-types": "warn",
      "perfectionist/sort-jsx-props": "warn",
      "perfectionist/sort-named-imports": "warn",
      "perfectionist/sort-object-types": [
        "warn",
        {
          groups: ["required-property", "optional-property"],
          order: "asc",
        },
      ],
      "perfectionist/sort-objects": "warn",
      "perfectionist/sort-union-types": [
        "warn",
        {
          groups: [
            "conditional",
            "function",
            "import",
            "intersection",
            "named",
            "object",
            "operator",
            "literal",
            "keyword",
            "tuple",
            "union",
            "nullish",
          ],
          order: "asc",
          type: "alphabetical",
        },
      ],
    },
  },

  prettier,
];
