import sharedPreset from "@fitnest/shared/tailwind-preset";
import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
export default {
  presets: [sharedPreset],
  // The `../shared` glob is required so Tailwind generates the utility classes
  // referenced inside @fitnest/shared's variant definitions.
  content: ["./src/**/*.{ts,tsx}", "../shared/src/**/*.{ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [typography],
};
