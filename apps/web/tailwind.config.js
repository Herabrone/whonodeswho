/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // App chrome — calm slate/ink editorial palette
        ink: "#1a1d24",
        canvas: "#f4f3ef",
        panel: "#ffffff",
        line: "#e3e1da",
        muted: "#6b7280",
        accent: "#3b5bdb",
        // Relationship category colors — single source of truth mirrored in src/constants.ts
        family: "#3b5bdb",
        friend: "#2f9e44",
        romantic: "#e64980",
        work: "#f08c00",
        other: "#868e96",
      },
      fontFamily: {
        sans: ['"Inter"', "system-ui", "sans-serif"],
        display: ['"Fraunces"', "Georgia", "serif"],
      },
      boxShadow: {
        panel: "0 8px 30px rgba(20, 22, 28, 0.12)",
      },
    },
  },
  plugins: [],
};
