import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  dts: false,
  clean: true,
  target: 'node20',
  // playwright must be installed in the runtime environment
  external: ['playwright'],
  bundle: true,
  noExternal: ['@peek/db', '@peek/checker'],
})
