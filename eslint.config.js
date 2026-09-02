import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    // shadcn generates these, and deliberately exports each component's `cva`
    // variants beside it — `buttonVariants`, `tabsListVariants`. Splitting them
    // out to satisfy the fast-refresh rule would be undone by the next
    // `shadcn add`. The rule guards HMR granularity in files we author, not in
    // generated primitives.
    files: ["src/components/ui/**/*.tsx"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  {
    // ProjectionChart exports `buildSeries` beside the component deliberately.
    // chart.js draws to a canvas, and under jsdom it gives up before reading
    // its own configuration, so calling the mapping directly is the only way to
    // assert what the chart is told to plot. The rule is narrowed to that one
    // name rather than switched off, so another exported component or hook here
    // still reports — an exported constant does not, because the inherited
    // `allowConstantExport` already permits those everywhere. The cost is one
    // chart remounting on edit during development.
    files: ["src/components/Results/ProjectionChart.tsx"],
    rules: {
      "react-refresh/only-export-components": [
        "error",
        { allowConstantExport: true, allowExportNames: ["buildSeries"] },
      ],
    },
  },
]);
