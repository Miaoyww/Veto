import { defineConfig } from 'electron-vite'

const usageEndpoint = process.env.VETO_USAGE_ENDPOINT ?? 'https://api.miaoyww.top/event'
const usageIngestKey = process.env.VETO_USAGE_INGEST_KEY ?? '34da52216c7243248407dc283eddf0a5'

export default defineConfig({
  main: {
    define: {
      __VETO_USAGE_ENDPOINT__: JSON.stringify(usageEndpoint),
      __VETO_USAGE_INGEST_KEY__: JSON.stringify(usageIngestKey)
    }
  },
  preload: {}
})
