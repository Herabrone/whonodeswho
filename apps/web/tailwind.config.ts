import type { Config } from "tailwindcss";
import { tailwindTokens } from "./src/design-tokens";

export default {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: tailwindTokens,
  },
  plugins: [],
} satisfies Config;