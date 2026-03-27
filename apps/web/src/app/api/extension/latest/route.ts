import fs from 'node:fs'
import path from 'node:path'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function parseVersionFromName(name: string): string | null {
  const match = name.match(/^peek-extension-(\d+\.\d+\.\d+)\.zip$/)
  return match ? match[1] : null
}

function compareVersions(a: string, b: string): number {
  const norm = (v: string) => v.split('.').map(Number)
  const [a1, a2 = 0, a3 = 0] = norm(a)
  const [b1, b2 = 0, b3 = 0] = norm(b)
  if (a1 !== b1) return a1 - b1
  if (a2 !== b2) return a2 - b2
  return a3 - b3
}

export async function GET() {
  const releasesDir = path.join(process.cwd(), 'public', 'releases')

  if (!fs.existsSync(releasesDir)) {
    return NextResponse.json({ error: 'Releases folder not found' }, { status: 404 })
  }

  const files = await fs.promises.readdir(releasesDir)
  const versions = files
    .map((name) => ({ name, version: parseVersionFromName(name) }))
    .filter((f) => f.version)
    .sort((a, b) => compareVersions(b.version!, a.version!))

  const latest = versions[0]

  if (!latest?.version) {
    return NextResponse.json({ error: 'Latest extension not found' }, { status: 404 })
  }

  const filePath = path.join(releasesDir, latest.name)
  const buffer = await fs.promises.readFile(filePath)

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${latest.name}"`,
      'Content-Length': buffer.length.toString(),
    },
  })
}
