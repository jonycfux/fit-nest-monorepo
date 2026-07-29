// Primitive palette — the raw, theme-independent color facts.
// Authored as CommonJS (.cjs) so the config-time Tailwind preset can `require()` it
// (see docs/adr/0005). Values are RGB **channel triplets** (not hex) so that
// `rgb(var(--x) / <alpha-value>)` keeps opacity utilities (e.g. bg-primary/50) working.
//
// "Storefront Slate" palette (design handoff, 2026-07-26): cool slate surfaces, hard
// black hairlines, azure/cyan/green accent roles. See tokens/semantic.cjs for the
// role -> primitive mapping and docs/adr/0005 for the two-tier rationale.
module.exports = {
  black: "0 0 0", // #000000
  bgDeep: "14 22 32", // #0e1620
  bgApp: "23 26 33", // #171a21
  bg: "27 40 56", // #1b2838
  panel: "22 32 45", // #16202d
  panel2: "31 47 66", // #1f2f42
  raised: "42 71 94", // #2a475e
  lineSoft: "42 63 84", // #2a3f54
  lineStrong: "60 86 112", // #3c5670
  white: "255 255 255", // #ffffff
  fg: "199 213 224", // #c7d5e0
  fg2: "143 165 184", // #8fa5b8
  fg3: "124 147 168", // #7c93a8
  fg4: "84 107 128", // #546b80
  azure: "11 121 190", // #0b79be
  azureDim: "7 86 133", // #075685
  azureLift: "59 163 232", // #3ba3e8
  cyan: "102 192 244", // #66c0f4
  cyanDim: "65 122 155", // #417a9b
  green: "60 193 38", // #3cc126
  greenDim: "43 143 27", // #2b8f1b
  amber: "232 179 57", // #e8b339
  red: "217 75 61", // #d94b3d
  violet: "155 139 214", // #9b8bd6
  // Foreground colors for filled accent surfaces — not derived from an --sl-* base,
  // authored directly in the handoff for contrast reasons.
  primaryFg: "240 247 255", // #f0f7ff
  secondaryFg: "8 22 31", // #08161f
  successFg: "6 33 10", // #06210a
  linkHover: "143 211 255", // #8fd3ff
};
