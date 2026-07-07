# Monorepo VSIX Packaging Issue

## Problem

When running `vsce package` directly from `apps/vscode/`, the resulting VSIX includes ~3000+ files from the monorepo root (`../../`) and sibling app directories (`../`). This is because bun workspace symlinks in `node_modules/@cline/*` point to `../../../sdk/packages/*`, and `vsce` follows these symlinks, collecting the entire monorepo tree — including `.git/`, `node_modules/`, SDK packages, docs, evals, and plugins.

## Root Cause

- `node_modules/@cline/core` → `../../../../sdk/packages/core` (resolves to repo root + `sdk/packages/core`)
- `vsce` uses the `ignore` package for `.vscodeignore` matching, which **rejects** patterns with `../` as "outside scope"
- `.vscodeignore` patterns like `../**` and `../../*` have NO effect
- `node_modules/` in `.vscodeignore` does NOT prevent vsce from traversing symlink targets

## Solution: Staging Directory

Copy only the necessary files to a clean staging directory, then package from there:

```sh
mkdir -p .staging
cp -r package.json dist assets webview-ui/build walkthrough bundled-skills ... .staging/
cd .staging && vsce package --out ../lingink-<version>.vsix
```

This yields a clean VSIX with ~580 files (15 MB).

## Files to Include

| Path | Reason |
|------|--------|
| `package.json` | Extension manifest |
| `package.nls.json` | English localizations |
| `package.nls.zh-cn.json` | Chinese localizations |
| `README.md` | Marketplace readme |
| `CHANGELOG.md` | Release notes |
| `LICENSE.txt` | Apache 2.0 |
| `skills-lock.json` | Skills lock file |
| `dist/` | Bundled extension JS |
| `assets/` | Icons |
| `webview-ui/build/` | Built React app |
| `walkthrough/` | Onboarding walkthrough |
| `bundled-skills/` | Packaged ARS skills |

## Related

- `vsce` issue: [microsoft/vscode-vsce#1018](https://github.com/microsoft/vscode-vsce/issues/1018)
- Symlink handling in `vsce` does not respect `.vscodeignore` for dereferenced paths
