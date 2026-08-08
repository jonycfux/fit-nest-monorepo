import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'

// Tailwind is handled via PostCSS (postcss.config.js) on the Tailwind v3 line.
const config = defineConfig({
  resolve: { tsconfigPaths: true },
  // @fitnest/shared's themes/index.ts imports a raw .cjs token file at
  // runtime (docs/adr/0005 — Metro/NativeWind need it as CommonJS). Vite treats
  // workspace-linked packages as project source, not a pre-bundled dependency,
  // so by default neither its SSR module runner nor its client dev server run
  // that .cjs through any CJS→ESM interop:
  // - SSR: Vite's SSR runner can't execute the bare `require()` inside the
  //   .cjs at all, silently breaking every route's SSR output. `ssr.external`
  //   routes it through Node's native loader, which handles CJS natively.
  // - Client: without this, the browser gets the .cjs served verbatim (still
  //   literal `require()`/`module.exports`) and `import semantic from
  //   "...cjs"` fails with "does not provide an export named 'default'".
  //   `optimizeDeps.include` forces esbuild to pre-bundle @fitnest/shared like
  //   any other dependency, which performs the same CJS→ESM interop.
  ssr: { external: ["@fitnest/shared"] },
  optimizeDeps: { include: ["@fitnest/shared"] },
  plugins: [
    devtools(),
    nitro({ rollupConfig: { external: [/^@sentry\//] } }),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
