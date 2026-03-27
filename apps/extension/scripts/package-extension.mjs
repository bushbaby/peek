import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'
import { execSync } from 'node:child_process'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const pkgPath = path.join(rootDir, 'package.json')
const distDir = path.join(rootDir, 'dist')
const publicDir = path.resolve(rootDir, '../web/public')
const releasesDir = path.join(publicDir, 'releases')

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
const version = pkg.version

if (!fs.existsSync(distDir)) {
  console.error('dist/ does not exist; run the build first')
  process.exit(1)
}

fs.mkdirSync(releasesDir, { recursive: true })

const zipName = `peek-extension-${version}.zip`
const zipPath = path.join(releasesDir, zipName)

if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath)

execSync(`cd ${distDir} && zip -r ${zipPath} .`, { stdio: 'inherit' })

console.log(`Packaged extension to ${zipPath}`)
