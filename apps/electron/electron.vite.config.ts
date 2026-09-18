import { defineConfig } from 'electron-vite'

const telemetryEndpoint = process.env.VETO_TELEMETRY_ENDPOINT ?? ''

export default defineConfig({
  main: {
    define: {
      __VETO_TELEMETRY_ENDPOINT__: JSON.stringify(telemetryEndpoint)
    }
  },
  preload: {}
})
