import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')

const packages = [
  path.join(root, 'package.json'),
  path.join(root, 'apps/frontend/package.json'),
  path.join(root, 'apps/electron/package.json')
]

const version = process.argv[2]

if (!version) {
  console.error('Usage: npx tsx scripts/sync-version.ts <version>')
  console.error('Example: npx tsx scripts/sync-version.ts 0.75.0')
  process.exit(1)
}

// Validate semver-like format
if (!/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$/.test(version)) {
  console.error(`Invalid version: ${version}`)
  process.exit(1)
}

for (const pkgPath of packages) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  const old = pkg.version
  pkg.version = version
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8')
  console.log(`${path.relative(root, pkgPath)}: ${old} → ${version}`)
}

console.log(`\nSynced ${packages.length} packages to v${version}`)
