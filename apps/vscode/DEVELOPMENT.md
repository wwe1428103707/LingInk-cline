# Development

## Prerequisites

- [Bun](https://bun.sh) (package manager + runtime)
- Node.js >= 22
- protoc (protobuf compiler) — download from [protobuf releases](https://github.com/protocolbuffers/protobuf/releases), place `protoc.exe` at `apps/vscode/tmp-protoc/bin/`

## Quick Start (First Time)

```bash
# 1. Install dependencies
cd apps/vscode
cp .env.example .env

# 2. Build SDK workspace packages (required by the extension)
cd sdk/packages/shared && bun run build && bun tsc --emitDeclarationOnly --outDir dist
cd sdk/packages/llms && bun run build
cd sdk/packages/agents && bun run build

# 3. Generate protobuf code
cd apps/vscode
bun scripts/build-proto.mjs

# 4. Build extension + webview
bun esbuild.mjs
cd webview-ui && bun run build
```

## Debug in VS Code

1. Open this repository root (`LingInk-cline/`) in VS Code.
2. Press **`F5`** (or `Run` → `Start Debugging`).
3. The `preLaunchTask` (`watch`) starts tsc + esbuild in watch mode for incremental compilation.
4. A new VS Code window (extension host) opens with the extension loaded.
5. Click the Cline icon in the activity bar to open the sidebar webview.

### Launch Configurations

| Configuration | Environment | Use Case |
|---|---|---|
| **Run Extension (production)** | `production` | Default, connects to production API |
| **Run Extension (staging)** | `staging` | Test against staging backend |
| **Run Extension (local)** | `local` | Test against local backend |
| **Run Extension (Fresh Install Mode)** | `production` | Temporary profile, simulates first install |

Select a different config via `Ctrl+Shift+P` → `Debug: Select and Start Debugging`.

## Build Commands

```bash
# Extension only (esbuild)
bun esbuild.mjs

# Webview UI only (Vite)
cd webview-ui && bun run build

# Protobuf code generation (required after proto/ changes)
bun scripts/build-proto.mjs

# Full clean + rebuild
rm -rf dist webview-ui/build
bun esbuild.mjs
cd webview-ui && bun run build
```

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Webview blank / white sidebar | `webview-ui/build/` missing | Run `cd webview-ui && bun run build` |
| `ERR_MODULE_NOT_FOUND` for `chalk`/`globby` | Missing deps | Run `bun install` in `apps/vscode` |
| `protoc not found` | protoc binary missing | Download protoc to `tmp-protoc/bin/` |
| `Could not resolve "@cline/shared"` | SDK packages not built | Build the SDK workspaces (step 2 above) |
| TS errors in Problems panel | tsserver lacks root tsconfig | Root `tsconfig.json` exists; reload window if stale |
| `classList` errors in Console | VS Code webview framework internal | Benign, does not affect functionality |
