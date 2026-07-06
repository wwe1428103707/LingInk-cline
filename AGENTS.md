# Repository Guidelines

This file is the AI assistant's reference for working with the LingInk-cline monorepo (Cline — AI coding assistant with VS Code extension + CLI + Hub). For SDK-specific development, see `sdk/AGENTS.md`; for detailed architecture, see `sdk/ARCHITECTURE.md`.

## Project Overview

**LingInk (Cline)** — AI coding assistant that operates via natural-language task descriptions ("tasks" or "projects"). Multilingual (en/zh), supports multiple LLM providers, runs in VS Code and standalone CLI. The monorepo contains the SDK, apps, plugins, evaluations, and documentation.

- **Repository**: `@cline/packages` (private monorepo)
- **License**: Apache 2.0
- **Stack**: TypeScript (strict), Bun 1.3.13, React (VSCode webview), OpenTUI (CLI)

## Architecture & Data Flow

### Layered SDK Design (bottom-up)

```
@cline/shared  →  @cline/llms  →  @cline/agents  →  @cline/core  →  apps (CLI / VS Code / Hub)
```

| Layer | Package | Responsibility |
|-------|---------|----------------|
| 1 | `@cline/shared` | Zod schemas, parse utils, storage paths, prompt builders, LLM gateway, hooks, agent types, remote config. Dual entry (`index.ts` + `index.browser.ts`). |
| 2 | `@cline/llms` | Provider settings/config, model catalogs, provider manifests, handler creation, middleware. Dual entry. |
| 3 | `@cline/agents` | Stateless agent loop, tool orchestration, hook/extension runtime, event streaming. Pure — no session/storage/state. |
| 4 | `@cline/core` | Stateful orchestration: session lifecycle, checkpointing, storage, config watching, default tools, plugin loading, telemetry, auth, cron. Exposes `@cline/core/hub`, `@cline/core/hub/daemon-entry`. |
| 5 | Apps | `apps/cli` (commander + OpenTUI), `apps/vscode` (extension), `apps/cline-hub` (dashboard HTTP server). Each consumes `@cline/core`. |

### Key Runtime Flows

- **Session lifecycle**: `ClineCore.create()` → `createRuntimeHost()` → `ClineCore.start(input)` → `host.startSession()`. Sessions run via `AgentRuntime` loop. Events via `subscribe()` pattern.
- **Runtime host abstraction**: `RuntimeHost` interface decouples transport from execution. Implementations: `LocalRuntimeHost`, `HubRuntimeHost`, `RemoteRuntimeHost`. Contract: `startSession`/`runTurn`/`stopSession`/`abort`.
- **Agent loop** (`@cline/agents`): pure tool-call → model-response → tool-result loop. Browser-safe. Wrapped by `@cline/core` with persistence, checkpoint, telemetry.
- **Checkpointing**: Git-based workspace snapshot + session checkpoint versioning (`session/checkpoint-diff.ts`, `session-versioning-service.ts`).
- **Context compaction**: Truncation + agentic summarization (`extensions/context/compaction.ts`).
- **Tool system**: Unified registry (`extensions/tools/`): builtin + MCP + plugin + team tools. Tool approval system, subprocess sandbox.
- **MCP client**: Full MCP protocol support (stdio/SSE/streamable-http transports) + OAuth + settings file management.
- **Plugin system**: Sandboxed plugin loading with `AgentExtension` interface providing hooks, MCP servers, tools, rules.

### Storage

- **File-based** under `~/.cline/` for sessions, providers, hooks, skills, rules, workflows
- **SQLite** (`better-sqlite3`) for session store, team store, cron
- Path resolution centralized in `@cline/shared/src/storage/paths.ts`

## Key Directories

| Path | Purpose |
|---|---|
| `sdk/packages/` | SDK packages: `shared/`, `llms/`, `agents/`, `core/`, `sdk/` |
| `apps/cli/` | CLI app (commander + OpenTUI) |
| `apps/vscode/` | VS Code extension (React webview UI) |
| `apps/cline-hub/` | Cline Hub dashboard server |
| `plugins/` | Plugins (e.g. academic-research-skills) |
| `evals/` | Benchmarks, smoke tests, E2E evaluations |
| `docs/` | Mintlify MDX documentation site (~80+ files) |
| `.github/workflows/` | CI/CD pipelines (sdk-test, sdk-publish, cli-publish, ext-vscode-*) |
| `.clinerules/` | Repository rules, workflows, AI guidance |
| `.claude/` / `.cline/` | AI agent skill configs |

## Development Commands

Run from **repository root** (or `sdk/` for SDK-specific work):

```sh
# Install
bun install

# Build (SDK packages only)
bun run build:sdk

# Full build (clean → install → build SDK → build CLI)
bun run build

# Type checking (all workspaces parallel)
bun run types

# Test (parallel across SDK packages + CLI + hub)
bun run test

# Unit tests (5 packages in parallel bash)
bun run test:unit

# E2E tests
bun run test:e2e

# Single workspace test
bun -F @cline/core test:unit

# Lint / Format / Full check
bun run lint
bun run format
bun run check       # full CI gate

# Fix unsafe issues
bun run fix

# Model definitions generation
bun run build:models

# CLI dev mode
bun run cli

# Release (SDK packages + CLI + VS Code)
bun run release
```

### Path aliases

- `@/` → `apps/vscode/src/` (VS Code workspace only)
- `@cline/core/shared/llms/agents` → resolved via workspace packages

## Code Conventions & Common Patterns

### Formatting & Linting

- **Biome 2.4.5** — sole formatter + linter (no Prettier, no ESLint)
- Indent: **tab** (4-wide in `apps/vscode/`)
- Line width: 130 (`apps/vscode/`), default for others
- `organizeImports` + `useSortedAttributes` on save (VS Code)
- Config: `biome.json` at root, `sdk/biome.json`, `apps/biome.json`

Run: `bun run format` / `bun run lint` / `bun run fix`

### TypeScript

- Module: ESM (`"type": "module"`)
- Target: `es2022`, strict mode
- `isolatedModules: true`, `noEmit: true` (type-check only; Bun/esbuild do compilation)
- Strict null checks, no unchecked indexed access
- Dual entry: `.browser.ts` variant for browser-safe exports alongside `index.ts`

### Imports

- `node:` protocol preferred for Node builtins (`import { assert } from "node:assert"`)
- Path alias `@/` for `apps/vscode/src/` deep imports
- Workspace packages referenced by name (`@cline/core`, `@cline/agents`)

### Naming

- **Files**: `kebab-case.ts` (e.g. `session-versioning-service.ts`)
- **Classes/Interfaces**: PascalCase (`ClineCore`, `AgentRuntime`, `RuntimeHost`)
- **Functions/variables**: camelCase
- **Constants**: camelCase (NOT UPPER_SNAKE unless truly immutable env-level constants)
- **Test files**: `*.test.ts` for unit, `*.e2e.test.ts` for end-to-end

### Async Patterns

- **CLI entry**: top-level async IIFE (`void (async () => { … })()`) — never top-level `await`
- **Fatal error handlers**: `process.on("uncaughtException")` / `"unhandledRejection"` route through cleanup + `process.exit(1)`
- **Signal handling**: SIGINT/SIGTERM forward to `abortActiveRuntime()` + exit
- **Avoid `asyncio.run()`** equivalent — Bun/Node support top-level await directly
- Subprocess sandbox via tool system

### State & Dependency Management

- **No DI framework** — factory functions + constructor injection
- **No global state library** — services own state via class instances
- Global settings: `services/global-settings.ts`
- Provider auth: `ProviderSettingsManager`
- Telemetry: OpenTelemetry (OTLP HTTP) + PostHog
- OAuth flows: Cline account, OpenAI Codex, OCA (device auth + local OAuth server)

### Error Handling

- Typed errors where possible; throw `Error` subclasses
- Wrapped fatal errors at process level (CLI), never swallowed
- Abort-safe: `isAbortInProgress()` check before marking rejection as handled

### Testing Patterns

- **Vitest** — primary framework (unit + e2e across SDK + CLI)
- **Mocha** + `@vscode/test-cli` — VS Code extension host tests
- **Bun test** (`bun:test`) — Node-side VS Code unit tests
- **Playwright** — VS Code extension E2E
- **pytest** — Python plugin tests (academic-research-skills)

Test layers:
1. **Unit/Contract** (fast): `*.test.ts`, vitest. `test:unit` for parallel execution
2. **VSCode Integration** (medium): mocha via `@vscode/test-cli`, compiled `.test.js`
3. **Smoke Tests** (minutes): real LLM invocation, `pass@k` metrics
4. **E2E** (hours): full agent benchmarks via custom runners

### Config Watching

- Config watchers use chokidar-based file watching
- Watcher state kept with config layer — no thin runtime wrappers

### Telemetry

- OpenTelemetry SDK (OTLP HTTP exporters for traces/logs/metrics)
- Langfuse integration for LLM observability
- PostHog for product analytics

### Release Process

- SDK packages: `bun run release` → `sdk/scripts/release.ts`
- Git tags: `sdk/shared/vX.Y.Z`, `sdk/llms/vX.Y.Z`, `cli-vX.Y.Z`, `vX.Y.Z` (VS Code)
- VSIX for marketplace, npm for CLI, SDK packages published individually
- Nightly builds via `publish-nightly.mjs`

## Important Files

| File | Purpose |
|---|---|
| `apps/cli/src/index.ts` | CLI shebang entrypoint → `main.ts` (runCli) |
| `apps/vscode/src/extension.ts` | VS Code extension activation |
| `apps/cline-hub/src/server.ts` | Cline Hub HTTP server |
| `sdk/packages/core/src/index.ts` | `ClineCore` main class + re-exports |
| `sdk/packages/agents/src/index.ts` | `AgentRuntime` |
| `sdk/packages/llms/src/index.ts` | Provider settings/configs |
| `sdk/packages/shared/src/index.ts` | Shared contracts + utilities |
| `package.json` | Root workspace config + scripts |
| `biome.json` | Root formatter/linter config |
| `vitest.config.ts` | Root test aggregation (project refs) |
| `.github/workflows/` | CI/CD pipelines |
| `.husky/pre-commit` | Pre-commit hook (gitleaks + lint-staged) |

## Runtime/Tooling Preferences

- **Runtime**: Bun 1.3.13 (`bun` only — not Node.js except for VS Code host)
- **Node**: >=22 (`.nvmrc`, `.tool-versions`, but Bun is the primary runner)
- **Package manager**: `bun@1.3.13` (workspaces, scripts). Do NOT use `npm`/`yarn`/`pnpm`
- **Shell development**: Prefer `eval` cells (IPython/JS kernel) over bash scripting for non-trivial logic
- **Language server**: LSP available for TypeScript (tsserver) — use `lsp` for rename/references/definition
- **CodeGraph**: `.codegraph/` indexed — use `codegraph_explore` before grep/read loops to locate symbols

## Testing & QA

### Running Tests

```sh
# All tests
bun run test

# Unit tests only
bun run test:unit

# E2E tests
bun run test:e2e

# Single package
bun -F @cline/core test:unit
bun -F @cline/cli test:unit

# Interactive CLI E2E
bun run test:e2e:interactive

# Full CI gate (lint → format → build → typecheck → check-publish)
bun run check
```

### Coverage

- No unified coverage across monorepo
- VS Code mocha tests: `c8` (lcov + html)
- VS Code webview-ui: `vitest --coverage` (v8 provider)
- SDK packages: no coverage target configured

### Pre-commit Checks

- Gitleaks secret scanning (`gitleaks git --pre-commit --redact --staged --verbose`)
- `lint-staged`: `bun run types` + `biome check` on staged files in `sdk/` + `apps/{cli,cline-hub,examples}/`

### CI Pipelines

In `.github/workflows/`:
- `sdk-test.yml` / `sdk-publish.yml` — SDK CI + npm publish
- `cli-publish.yml` — CLI npm publish
- `ext-vscode-test.yml` / `ext-vscode-test-e2e.yml` — VS Code extension CI
- `ext-vscode-publish-stable.yml` / `ext-vscode-publish-legacy.yml` / `ext-vscode-publish-nightly.yml` — VS Code marketplace
- `repo-label-issues.yml` — issue labeling

### VS Code Dev Extensions (Required)

- `biome` — formatter/linter
- `bun-vscode` — Bun tooling
- `esbuild-problem-matchers` — build error highlighting
- `extension-test-runner` — test UI
- `tailwindcss` — IntelliSense for webview UI

## SDK-Specific Notes

For SDK package work, refer to `sdk/AGENTS.md` — this file describes package boundaries, dependency rules, development workflow, and change routing between SDK packages.
