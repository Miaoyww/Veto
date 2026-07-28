import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')

const target = path.join(root, 'packages/veto-types/index.d.ts')

function getVersion(): string {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))

  return pkg.version
}

function update() {
  const version = getVersion()

  let content = fs.readFileSync(target, 'utf8')

  content = content.replace(
    /^\/\/ Type definitions for Veto Plugin API .*\n/,
    `// Type definitions for Veto Plugin API ${version}\n`
  )

  fs.writeFileSync(target, content, 'utf8')

  console.log(`Updated @vetoexpress/types ${version}`)
}

update()
