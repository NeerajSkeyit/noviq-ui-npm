import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

const TESTS = ["src/**/*.test.{ts,tsx}", "src/test/**"];

export default defineConfig([
  // dist and the packed tarballs are build output; the *.d.ts files are tsc's
  globalIgnores(["dist", "coverage", "**/*.d.ts"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, tseslint.configs.recommended, reactHooks.configs.flat["recommended-latest"]],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    rules: {
      // Drawer and Input mirror an open/value prop into state on purpose (the Drawer keeps its closing
      // animation mounted). Reworking that is a behaviour change, so it is flagged, not failed.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    // The build plugins and the config run in Node
    files: ["vite.config.ts", "vitest.config.ts", "build/**/*.ts", "eslint.config.js"],
    languageOptions: { globals: globals.node },
  },
  {
    // Shipped code. `any` is how the public generics default (`TableColumn<T = any>`, `FormController`,
    // `Input`'s value): tightening it to `unknown` would break consumers' types, so it is a warning that
    // keeps new ones visible rather than an error.
    files: ["src/**/*.{ts,tsx}"],
    ignores: TESTS,
    extends: [reactRefresh.configs.vite],
    rules: { "@typescript-eslint/no-explicit-any": "warn" },
  },
  {
    // These files export a helper next to the component it serves (formatTableCellValues,
    // useNoviqUIConfig…). The package is consumed built, so fast-refresh of its own source is moot.
    files: ["src/components/Table/TableCell.tsx", "src/config/NoviqUIConfigProvider.tsx"],
    rules: { "react-refresh/only-export-components": "off" },
  },
  {
    // Tests mock loosely and reassign outer variables to observe a render
    files: TESTS,
    rules: { "@typescript-eslint/no-explicit-any": "off", "react-hooks/globals": "off" },
  },
]);
