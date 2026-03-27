# Peek Chrome Extension

Automation for versioning, building, and packaging lives in package scripts.

## Commands
- Sync manifest version manually: `pnpm --filter @peek/extension sync-version`
- Build + package (creates versioned zip and latest pointer): `pnpm --filter @peek/extension build`
- Package only (after a build): `pnpm --filter @peek/extension package`
- Bump version (patch|minor|major), sync, build, and package:
  - `pnpm --filter @peek/extension version patch`
  - `pnpm --filter @peek/extension sync-version`
  - `pnpm --filter @peek/extension build`

## Outputs
- Production build: apps/extension/dist
- Zips: apps/web/public/releases/peek-extension-<version>.zip (endpoint selects the highest version)

## Release flow
1. `pnpm --filter @peek/extension version <bump>`
2. `pnpm --filter @peek/extension build`
3. Upload apps/web/public/peek-extension-<version>.zip to the Chrome Web Store listing.
