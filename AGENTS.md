# Repository Guidelines

> **Development Focus**: All active development targets the **VS Code extension** (`apps/vscode/`). The CLI app (`apps/cli/`) is **on hold** — do not modify CLI code, add CLI-specific features, or account for CLI behavior in new changes. SDK packages still serve the VS Code extension and should be improved as needed; just ignore the CLI consumer.

This file is the AI assistant's reference for the **LingInk-cline** monorepo. LingInk （灵砚）is a Chinese-language academic-writing assistant built on top of [Cline](https://github.com/cline/cline). It runs as a VS Code extension and is backed by a layered TypeScript SDK.

For SDK-specific boundaries and change-routing rules, see `sdk/AGENTS.md`. For deep architectural design, see `sdk/ARCHITECTURE.md`.

## Project Overview

| Item | Value |
|------|-------|
| Product | LingInk （灵砚）— AI academic-writing assistant |
| Extension package | `claude-dev` v0.1.7, `clineBaseVersion` 4.0.0 |
| SDK packages | `@cline/{shared,llms,agents,core,sdk}` v0.0.53 |
| Repository | `@cline/packages` (private monorepo) |
| License | Apache 2.0 |
| Runtime | Bun 1.3.13 primary; Node.js >=22 for host/compat |
| Package manager | `bun@1.3.13` (workspaces) |
| Language | Source code and comments in English; user-facing docs/specs in Chinese |

## Repository Structure

Bun workspaces are declared in the root `package.json`:

```
sdk/packages/*            SDK packages
apps/*                    Applications
apps/vscode/webview-ui    VS Code webview UI
apps/vscode/testing-platform
apps/cline-hub/src/webview
apps/examples/*
sdk/examples
sdk/examples/plugins/*
```

### Key directories

| Path | Purpose |
|------|---------|
| `sdk/packages/shared` | Low-level contracts, schemas, path helpers, hooks, remote-config, storage |
| `sdk/packages/llms` | Provider configs, model catalogs, handler factory, middleware |
| `sdk/packages/agents` | Stateless agent runtime loop, tool orchestration, events |
| `sdk/packages/core` | Stateful orchestration: `ClineCore`, sessions, storage, hub, telemetry, cron |
| `sdk/packages/sdk` | Public alias package; re-exports `@cline/core` |
| `apps/vscode` | VS Code extension + React webview UI |
| `apps/cline-hub` | Bun HTTP/WebSocket dashboard server + hub webview |
| `apps/cli` | CLI/TUI app — **on hold**, do not modify |
| `apps/examples` | Standalone SDK/VS Code integration examples |
| `plugins/academic-research-skills` | Academic-research skill plugin |
| `evals` | Benchmarks, smoke tests, E2E evaluations |
| `docs` | Documentation site |
| `.github/workflows` | CI/CD pipelines |
| `.husky` | Pre-commit hooks |

## Technology Stack

- **Language**: TypeScript 5.9.3, strict mode, ESM (`"type": "module"`)
- **Runtime**: Bun 1.3.13; Node.js >=22 for VS Code host and some CI jobs
- **Build tools**: Bun bundler, `esbuild` (VS Code extension), `tsc --noEmit` for type-checking, Vite (webviews)
- **UI**: React 18/19, Tailwind CSS v4, HeroUI/Radix/shadcn, Framer Motion, Lucide, Mermaid, Storybook 9
- **Formatter/Linter**: Biome 2.4.5 only (no Prettier/ESLint)
- **Testing**: Vitest 4, Bun test, Mocha via `@vscode/test-cli`, Playwright, `@microsoft/tui-test`
- **Persistence**: SQLite via `better-sqlite3`, file-based storage under `~/.cline/`
- **Observability**: OpenTelemetry OTLP HTTP exporters, PostHog, Langfuse
- **Protocol**: MCP (stdio/SSE/streamable-http), gRPC/protobuf for VS Code host bridge
- **Native deps trusted for install**: `better-sqlite3`, `grpc-tools`

## SDK Architecture

Layered dependency direction (lower layers do not depend on higher layers):

```
@cline/shared  →  @cline/llms  →  @cline/agents  →  @cline/core  →  apps
```

| Package | Responsibility | Key exports |
|---------|----------------|-------------|
| `@cline/shared` | Schemas, types, path helpers, hooks, remote-config, storage, prompt/parse utilities | `AgentMessage`, `AgentTool`, `ContributionRegistry`, `RemoteConfig`, `ProviderSettings`, `setHomeDirIfUnset` |
| `@cline/llms` | Provider/model catalogs, manifests, handler creation, middleware | `ModelInfo`, `ProviderInfo`, `createHandler`, `ApiHandler`, `DefaultGateway` |
| `@cline/agents` | Stateless agent loop, tool orchestration, event streaming | `AgentRuntime`/`Agent`, `AgentRuntimeConfig`, `createAgentRuntime`, `createTool` |
| `@cline/core` | Stateful orchestration, sessions, hub, storage, telemetry, cron | `ClineCore`, `RuntimeHost`, `LocalRuntimeHost`, `HubRuntimeHost`, `RemoteRuntimeHost`, `DefaultRuntimeBuilder`, `SqliteSessionStore` |
| `@cline/sdk` | Public SDK entry | Re-exports `@cline/core` |

### Runtime data flow

1. Host calls `ClineCore.create(...)`.
2. `ClineCore` selects a `RuntimeHost` (`LocalRuntimeHost`, `HubRuntimeHost`, or `RemoteRuntimeHost`).
3. `RuntimeHost.startSession(...)` runs the stateless `AgentRuntime` loop from `@cline/agents`.
4. `@cline/agents` calls `@cline/llms` handlers and executes tools.
5. `@cline/core` persists state, checkpoints, telemetry, and events.

### Key subsystems

- **Checkpointing**: git-based workspace snapshots + session versioning (`session-versioning-service.ts`).
- **Context compaction**: core-owned truncation/summarization (`extensions/context/compaction.ts`).
- **Tool system**: unified registry in `core/src/extensions/tools/`; built-in, MCP, plugin, and team tools; subprocess sandbox.
- **MCP client**: full MCP protocol support + OAuth + settings file management.
- **Plugin system**: sandboxed `AgentExtension` loading; extensions provide hooks, MCP servers, tools, rules.
- **Automation/Cron**: file-based recurring/event-driven tasks under `~/.cline/cron/`, orchestrated by `CronService` (`packages/core/src/cron/`).
- **Hub**: shared local or remote daemon (`packages/core/src/hub/`) with WebSocket command dispatch and host-side client adapters exported from `@cline/core/hub`.

### Storage

- File-based under `~/.cline/` for sessions, providers, hooks, skills, rules, workflows.
- SQLite (`better-sqlite3`) for session store, team store, and cron store.
- Path resolution is centralized in `@cline/shared/src/storage/paths.ts`.

## Application Architecture

### `apps/vscode` — VS Code extension

- Entry: `apps/vscode/src/extension.ts` (activation).
- Cross-platform init lives in `apps/vscode/src/common.ts`.
- `src/hosts/host-provider.ts` abstracts platform-specific services (webview, diff, terminal, host bridge, callbacks, binaries).
- `src/hosts/vscode/` contains VS Code-specific implementations.
- `src/sdk/` contains SDK adapters: session factory, VS Code LM handler, message translation, checkpoint/telemetry coordinators.
- Webview UI is a separate workspace at `apps/vscode/webview-ui/` (React + Vite).
- Build pipeline:
  - `bun scripts/build-proto.mjs` generates protobuf code under `src/generated/` and `src/shared/proto/`.
  - `bun esbuild.mjs` bundles the extension to `dist/extension.js`.
  - `cd webview-ui && bun run build` builds the webview assets.
- Extension manifest: `apps/vscode/package.json` (`claude-dev`, VS Code `^1.104.0`).

### `apps/cline-hub` — Browser dashboard

- Server entry: `apps/cline-hub/src/server.ts` (Bun HTTP + WebSocket).
- WebSocket `/browser` endpoint handles session attach, send/abort, provider settings, approvals, etc.
- Webview workspace: `apps/cline-hub/src/webview/` (React + Vite + Tailwind).

### `apps/examples`

Self-contained example projects (`quickstart`, `cline-core-cli-agent`, `code-review-bot`, `multi-agent`, `desktop-app`, `vscode`, etc.) that consume `@cline/sdk` or workspace packages.

### `apps/cli`

On hold. Do not modify.

## Build, Test & Release Commands

Run from the repository root unless noted.

### Root commands

| Command | Purpose |
|---------|---------|
| `bun install` | Install all workspace dependencies |
| `bun run build:sdk` | Production build of all `sdk/packages/*` |
| `bun run build` | Clean → install → `build:sdk` → `@cline/cli` build (CLI is on hold but still built here) |
| `bun run build:apps` | Production build of `apps/**` |
| `bun run build:models` | Regenerate LLM model definitions via `@cline/llms`, then format |
| `bun run types` | Parallel `typecheck` across all workspaces |
| `bun run test` | Parallel tests across SDK packages + CLI + hub |
| `bun run test:unit` | Focused unit-test subset (agents, llms, core, CLI, hub) |
| `bun run test:e2e` | Core + CLI e2e tests |
| `bun run lint` | Biome lint on `sdk/`, `apps/cli/`, `apps/cline-hub/`, `apps/examples/` |
| `bun run format` | Biome format on the same scope |
| `bun run fix` | Biome check `--write --unsafe --diagnostic-level=error` |
| `bun run check` | Full CI gate: lint + `build:sdk` + CLI build + hub webview build + typecheck + `check-publish` |
| `bun run release` | Run `sdk/scripts/release.ts` |

### SDK package commands

```bash
bun -F @cline/shared test
bun -F @cline/llms test
bun -F @cline/agents test
bun -F @cline/core test:unit
bun -F @cline/core test:e2e
```

SDK packages must be built (`bun run build:sdk`) before consumers can resolve their `dist/` exports.

### VS Code extension commands (run from `apps/vscode`)

| Command | Purpose |
|---------|---------|
| `bun run watch` | Parallel esbuild + tsc watch |
| `bun run package` | Production build: type-check → webview → lint → esbuild |
| `bun run build:webview` | Generate protos and build the React webview |
| `bun run check-types` | Type-check extension + webview |
| `bun run lint` | Biome lint + proto lint |
| `bun run format` | Format changed files since `main` |
| `bun run test:unit` | Bun-test node-side suites |
| `bun run test:vitest` | Vitest SDK-adapter / model-catalog suites |
| `bun run test:integration` | Extension-host tests via `@vscode/test-cli` |
| `bun run test:coverage` | Integration tests with `c8` coverage |
| `bun run test:webview` | Webview UI unit tests |
| `bun run e2e` | Playwright E2E |
| `bun run ci:check-all` | Parallel `check-types` + `lint` + `format` |
| `bun run ci:build` | Protos + webview + esbuild + compile-tests |

## Code Style & Conventions

### Formatting and linting

- **Biome 2.4.5** is the only formatter and linter.
- Config hierarchy:
  - Root: `biome.json` (tabs, base rules).
  - SDK: `sdk/biome.json` (extends root; enforces package entrypoints for cross-package imports).
  - Apps: `apps/biome.json` (extends `sdk/biome.json`).
  - VS Code extension: `apps/vscode/biome.jsonc` (root: true; 4-wide tabs, 130-column lines, LF, semicolons `asNeeded`, organize imports, sorted attributes, custom grit plugins).
- Root `format`/`lint`/`fix`/`check` intentionally **do not** touch `apps/vscode/**`; the VS Code workspace has its own scripts.

### TypeScript

- ESM modules, target `es2022`, strict mode, `isolatedModules: true`, `noEmit: true`.
- VS Code workspace uses `moduleResolution: Bundler` and `jsx: react`.
- Dual-entry browser builds: `index.ts` + `index.browser.ts` in `@cline/shared` and `@cline/llms`.

### Imports

- Use `node:` protocol for Node builtins (`import { assert } from "node:assert"`).
- VS Code workspace uses `@/` alias → `apps/vscode/src/`.
- SDK packages must import through package entrypoints; `sdk/biome.json` blocks deep imports into another package's `src/`.
- Workspace packages are referenced by name (`@cline/core`, `@cline/agents`).

### Naming

- Files: `kebab-case.ts`.
- Classes/interfaces: PascalCase (`ClineCore`, `AgentRuntime`, `RuntimeHost`).
- Functions/variables/constants: camelCase. Avoid `SCREAMING_SNAKE_CASE` unless it is an env-level constant.
- Test files: `*.test.ts` (unit), `*.e2e.test.ts` (end-to-end).

### Code organization principles

- **No DI framework** — use factory functions and constructor injection.
- **No global state library** — services own state via class instances.
- Keep `@cline/agents` stateless: no session persistence, provider storage, or RPC lifecycle.
- Keep `@cline/core` generic — no organization/provider-specific logic.
- Config watchers project file state; avoid thin runtime wrappers that just mirror watcher output.
- Logging is injectable via `BasicLogger` from `@cline/shared`; do not hardcode logging backends.
- In `apps/vscode`, do not use `console.log` directly — grit plugins enforce use of the `Logger` service.

### Error handling

- Prefer typed `Error` subclasses.
- Fatal process errors route through cleanup + `process.exit(1)`.
- Abort-safe: check `isAbortInProgress()` before marking a rejection as handled.

## Testing Strategy

| Layer | Framework | Config / Entry |
|-------|-----------|----------------|
| SDK unit | Vitest | `sdk/packages/*/vitest.config.ts` |
| CLI unit | Vitest | `apps/cli/vitest.config.ts` |
| Hub unit | Vitest | `apps/cline-hub/vitest.config.ts` |
| VS Code node-side | Bun test | `apps/vscode/scripts/run-bun-unit-tests.ts` |
| VS Code SDK/model-catalog | Vitest | `apps/vscode/vitest.config.ts` |
| VS Code integration | Mocha via `@vscode/test-cli` | `.vscode-test.mjs`, compiled `.test.js` |
| VS Code webview UI | Vitest + jsdom + Testing Library | `apps/vscode/webview-ui/package.json` |
| VS Code E2E | Playwright | `apps/vscode/playwright.config.ts` |
| Evals / analysis | Vitest / custom runners | `evals/analysis/package.json`, `evals/smoke-tests/run-smoke-tests.ts` |

### How to run tests

```bash
# All SDK + CLI + hub tests
bun run test

# Focused unit subset
bun run test:unit

# Single SDK package
bun -F @cline/core test:unit
bun -F @cline/llms test

# VS Code extension (from apps/vscode)
bun run test:unit
bun run test:vitest
bun run test:integration
bun run test:webview
bun run e2e

# Full CI gate
bun run check
```

### Coverage

- VS Code integration tests: `c8` → `lcov` + `html`.
- VS Code webview UI: `@vitest/coverage-v8`.
- Test-platform orchestrator: `c8`.
- SDK packages: no configured coverage target.
- Coverage artifacts are uploaded to Qlty in CI.

## Security Considerations

- **Pre-commit secret scanning**: `.husky/pre-commit` requires `gitleaks` and runs `gitleaks git --pre-commit --redact --staged --verbose`. Install `gitleaks` before committing.
- **Secret config**: `.gitleaks.toml` extends the default gitleaks rules.
- **Environment secrets**: Copy `.env.example` to `.env` in `apps/vscode/` for local development. Never commit `.env`, `.secrets`, `secrets.json`, or `*.db`.
- **Console logging**: In `apps/vscode`, direct `console.log` is blocked by a grit plugin; route through the `Logger` service so sensitive data does not leak.
- **Hub auth**: The local hub daemon generates a per-process random token stored in the owner discovery record with owner-only file permissions. Clients send it via `Sec-WebSocket-Protocol` or `Authorization: Bearer`; the server validates with constant-time comparison.
- **MCP / OAuth**: OAuth tokens and MCP settings are persisted under `~/.cline/`; treat that directory as sensitive in local backups.

## CI/CD & Release

Workflows live in `.github/workflows/`:

| Workflow | Purpose |
|----------|---------|
| `sdk-test.yml` | SDK quality gate: build SDK + CLI, typecheck, lint, unit tests on Ubuntu/Windows, SQLite smoke test, TUI e2e, publishability check |
| `sdk-publish.yml` | Publishes `@cline/{shared,llms,agents,core,sdk}` to npm with trusted publishing (OIDC); tags `sdk/<pkg>/vX.Y.Z` |
| `ext-vscode-test.yml` | VS Code extension CI: typecheck, lint, format, unit/integration/webview tests, testing-platform orchestrator, Qlty coverage |
| `ext-vscode-test-e2e.yml` | VS Code E2E with Playwright across Ubuntu/Windows/macOS |
| `ext-vscode-publish-stable.yml` | Stable/pre-release VSIX to Marketplace + Open VSX, GitHub release, Slack notification |
| `ext-vscode-publish-nightly.yml` | Timestamped nightly VSIX publish |
| `ext-vscode-publish-legacy.yml` | Legacy pre-SDK-migration extension publish from `legacy-extension` branch |
| `cli-publish.yml` | **On hold** — legacy CLI npm/binary publish workflow |
| `repo-label-issues.yml` / `repo-stale-issues.yml` | Issue automation |

### Release artifacts

- **SDK packages**: published individually to npm in dependency order.
- **VS Code extension**: packaged as `.vsix` with `vsce --no-dependencies` and published to the VS Code Marketplace and Open VSX.
- **Nightly builds**: produced by `apps/vscode/scripts/publish-nightly.mjs`.

## Important Files

| File | Purpose |
|------|---------|
| `apps/vscode/src/extension.ts` | VS Code extension activation |
| `apps/vscode/DEVELOPMENT.md` | VS Code dev quick-start and troubleshooting |
| `apps/cline-hub/src/server.ts` | Cline Hub HTTP/WebSocket server |
| `sdk/packages/core/src/ClineCore.ts` | Main `ClineCore` orchestrator |
| `sdk/packages/core/src/runtime/host/runtime-host.ts` | `RuntimeHost` abstraction |
| `sdk/packages/agents/src/agent-runtime.ts` | Stateless `AgentRuntime` loop |
| `sdk/packages/llms/src/index.ts` | Provider catalog and handler factory |
| `sdk/packages/shared/src/index.ts` | Shared contracts and utilities |
| `package.json` | Root workspace and scripts |
| `biome.json` / `sdk/biome.json` / `apps/vscode/biome.jsonc` | Format/lint configs |
| `tsconfig.json` | Root TypeScript config (VS Code workspace paths) |
| `vitest.config.ts` | Root Vitest project aggregation |
| `.mcp.json` | MCP config for the bundled `codegraph` stdio server |
| `.husky/pre-commit` | Pre-commit hook |

## Required VS Code Dev Extensions

- `biome` — formatter/linter
- `bun-vscode` — Bun tooling
- `esbuild-problem-matchers` — build error highlighting
- `extension-test-runner` — test UI
- `tailwindcss` — IntelliSense for webview UI

## SDK-Specific Notes

For SDK package boundaries, dependency direction, and change-routing rules, always consult `sdk/AGENTS.md`. For runtime flows and architectural constraints, see `sdk/ARCHITECTURE.md`.
