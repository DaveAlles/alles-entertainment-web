import js from "@eslint/js";
import parser from "@typescript-eslint/parser";
import ts from "@typescript-eslint/eslint-plugin";
import prettier from "eslint-config-prettier";
export default [
  { ignores: ["dist/**", "node_modules/**"] },
  { files: ["**/*.ts", "**/*.tsx"], languageOptions: { parser, parserOptions: { ecmaVersion: "latest", sourceType: "module", ecmaFeatures: { jsx: true } } }, plugins: { "@typescript-eslint": ts }, rules: { ...js.configs.recommended.rules, ...ts.configs.recommended.rules, "no-undef": "off", "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }] } },
  prettier,
];
