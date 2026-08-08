import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored agent/skill assets — prototype UI kits, not application source.
    // They aren't built or shipped, and their 10 jsx-no-undef errors were pure
    // noise in every lint run.
    ".claude/**",
    ".agents/**",
  ]),
]);

export default eslintConfig;
