import { cpSync, mkdirSync, rmSync, statSync } from 'node:fs'
import { resolve, sep } from 'node:path'

const workspaceRoot = resolve(process.cwd())
const source = resolve(workspaceRoot, 'apps/frontend/build')
const target = resolve(workspaceRoot, 'apps/electron/out/renderer')
const electronOut = resolve(workspaceRoot, 'apps/electron/out')

if (!statSync(source, { throwIfNoEntry: false })?.isDirectory()) {
  throw new Error(`Frontend build not found: ${source}`)
}

if (!target.startsWith(electronOut + sep)) {
  throw new Error(`Refusing to copy outside Electron output: ${target}`)
}

rmSync(target, { recursive: true, force: true })
mkdirSync(target, { recursive: true })
cpSync(source, target, { recursive: true })

console.log(`Copied frontend build to ${target}`)
