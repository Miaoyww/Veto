import { defineConfig } from 'electron-vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '$lib': path.resolve(__dirname, 'src/renderer/src/lib'),
        '$units': path.resolve(__dirname, 'src/renderer/src/units'),
      }
    },
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version)
    },
    plugins: [svelte(), tailwindcss()]
  }
})
