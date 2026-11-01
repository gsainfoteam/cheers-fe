import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

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
    rules: {
      "react-refresh/only-export-components": [
        "error",
        {
          allowConstantExport: true, // configs.vite 기본값 — 덮어쓰므로 다시 명시
          allowCompoundComponents: true, // configs.vite 기본값
          extraHOCs: [
            "createRootRoute",
            // createRootRouteWithContext<T>()({...}) — 커리된 호출이라
            // 이름을 적어주지 않으면 규칙이 라우트인 줄 모른다
            "createRootRouteWithContext",
            "createFileRoute",
            "createLazyFileRoute",
            "createRoute",
          ],
        },
      ],
    },
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ["src/components/ui/**/*.tsx"],
    rules: { "react-refresh/only-export-components": "off" },
  },
]);
