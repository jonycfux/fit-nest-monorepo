// Metro + NativeWind resolve `import "./global.css"` at build time, but neither
// ships types for it (nativewind/types only covers the `className` props), so
// TypeScript rejects the side-effect import. web-app gets the equivalent
// declaration from `vite/client`.
declare module "*.css";
