// Primitive palette — the raw, theme-independent color facts.
// Authored as CommonJS (.cjs) so the config-time Tailwind preset can `require()` it
// (see docs/adr/0005). Values are RGB **channel triplets** (not hex) so that
// `rgb(var(--x) / <alpha-value>)` keeps opacity utilities (e.g. bg-primary/50) working.
module.exports = {
  green600: "22 163 74", // #16a34a
  white: "255 255 255", // #ffffff
  slate200: "226 232 240", // #e2e8f0
  slate900: "15 23 42", // #0f172a
  slate950: "10 10 10", // #0a0a0a
  slate500: "100 116 139", // #64748b
};
