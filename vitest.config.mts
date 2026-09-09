import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      '$lib': resolve(import.meta.dirname, 'apps/frontend/src/lib')
    }
  }
})
