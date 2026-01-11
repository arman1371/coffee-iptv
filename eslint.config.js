import tseslint from "typescript-eslint";
import preact from "eslint-config-preact";
import eslintConfigPrettier from "eslint-config-prettier/flat";

export default tseslint.config(
  {
    ignores: ["public/js/webOSTVjs-1.2.10/**", "dist"],
  },
  preact,
  tseslint.configs.recommended,
  eslintConfigPrettier
);
