import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      ".next*/**",
      "node_modules/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },

  ...compat.extends(
    "next/core-web-vitals",
    "next/typescript"
  ),

  {
    files: ["pages/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            "@features/*/infrastructure/*",
            "@infrastructure/*",
            "../src/features/*/infrastructure/*",
            "../../src/features/*/infrastructure/*",
          ],
        },
      ],
    },
  },
  {
    files: ["src/shared/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: ["@features/*", "@app/*"],
        },
      ],
    },
  },
  {
    files: ["src/features/*/application/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            "@features/*/presentation/*",
            "@features/*/infrastructure/*",
            "@app/*",
          ],
        },
      ],
    },
  },
  {
    files: ["src/features/*/infrastructure/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: ["@features/*/presentation/*", "@app/*"],
        },
      ],
    },
  },
];

export default eslintConfig;
