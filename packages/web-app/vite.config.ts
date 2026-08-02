import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'

// Tailwind is handled via PostCSS (postcss.config.js) on the Tailwind v3 line.
const config = defineConfig({
  resolve: { tsconfigPaths: true },
  // @fitnest/shared's themes/index.ts requires() a raw .cjs token file at
  // runtime (docs/adr/0005 — Metro/NativeWind need it as CommonJS). Vite's dev
  // SSR module runner treats workspace packages as source and can't execute a
  // bare `require()` inside that .cjs, silently breaking every route's SSR
  // output. Externalizing it for SSR routes it through Node's native loader,
  // which handles CJS `require()` natively.
  ssr: { external: ["@fitnest/shared"] },
  plugins: [
    devtools(),
    nitro({ rollupConfig: { external: [/^@sentry\//] } }),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
