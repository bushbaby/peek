import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const pkgPath = path.resolve(__dirname, '..', 'package.json')
const manifestPath = path.resolve(__dirname, '..', 'manifest.json')

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

if (manifest.version !== pkg.version) {
  manifest.version = pkg.version
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(`Synced manifest version to ${pkg.version}`)
} else {
  console.log(`Manifest already at version ${pkg.version}`)
}
