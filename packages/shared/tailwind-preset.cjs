// Shared design tokens — the single source of truth for Tailwind across web + native.
// Authored as CommonJS (.cjs) so both apps' Tailwind config loaders can `require()` it.
/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#16a34a",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#e2e8f0",
          foreground: "#0f172a",
        },
        background: "#ffffff",
        foreground: "#0a0a0a",
        muted: "#64748b",
      },
      borderRadius: {
        lg: "12px",
      },
    },
  },
};
