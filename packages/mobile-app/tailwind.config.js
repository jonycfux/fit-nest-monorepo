/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("nativewind/preset"), require("@fitnest/shared/tailwind-preset")],
  // The `../shared` glob is required so NativeWind generates the utility classes
  // referenced inside @fitnest/shared's variant definitions.
  content: ["./App.tsx", "./src/**/*.{ts,tsx}", "../shared/src/**/*.{ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};
