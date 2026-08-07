import tsEslintPlugin from "@typescript-eslint/eslint-plugin";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import eslintConfigPrettier from "eslint-config-prettier";

const nextAppFiles = ["app/**/*.{js,jsx,mjs,ts,tsx,mts,cts}", "lib/**/*.{js,jsx,mjs,ts,tsx,mts,cts}", "next.config.mjs"];
const nextAppTsFiles = ["app/**/*.{ts,tsx,mts,cts}", "lib/**/*.{ts,tsx,mts,cts}"];
const [nextBaseConfig, nextTypeScriptConfig, _nextIgnoresConfig, nextCoreWebVitalsConfig] = nextCoreWebVitals;

export default [
  {
    ignores: ["**/dist/**", "**/.next/**", "**/node_modules/**", ".turbo/**", "pnpm-lock.yaml"],
  },
  ...tsEslintPlugin.configs["flat/recommended"],
  {
    ...nextBaseConfig,
    files: nextAppFiles,
    settings: {
      ...nextBaseConfig.settings,
      next: {
        rootDir: ".",
      },
    },
  },
  {
    ...nextTypeScriptConfig,
    files: nextAppTsFiles,
  },
  {
    ...nextCoreWebVitalsConfig,
    files: nextAppFiles,
    rules: {
      ...nextCoreWebVitalsConfig.rules,
      "@next/next/no-html-link-for-pages": "off",
      "react-hooks/error-boundaries": "off",
    },
  },
  eslintConfigPrettier,
];
