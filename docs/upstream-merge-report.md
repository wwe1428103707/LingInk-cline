# Upstream Merge Report

**Date:** 2026-07-18  
**Fork:** LingInk (`wwe1428103707/LingInk-cline`)  
**Upstream:** Cline (`cline/cline`)  
**Baseline:** `674a6022ee` — "Add an intermediate step before going to ClinePass model selection"  
**Upstream HEAD:** `557d725690` — "fix(vscode): shell mismatch on Windows" (v3.0.44)  
**Local HEAD:** `9e296cb39f`

---

## Summary

| Metric | Count |
|--------|-------|
| Upstream commits since fork | ~160 |
| Files changed upstream | 666 |
| Files merged (staged + direct) | ~147 initially, ~85 retained after SDK rollback |
| New files created | 4 (state-post-debouncer, legacy-task-handling, rollout-metadata, osc633Parser, shellPromptHeuristics) |
| Files manually patched | 4 (sdk-task-history.ts, editor.ts, state-keys.ts, sdk-task-start-coordinator.ts) |
| Files deleted (dead code) | 4 (CommandOrchestrator, CommandOrchestrator.test, commandOutputAsk.test, vscode-language-model.d.ts) |

---

## 1. What Was Merged

### 1.1 SDK Core (`@cline/core`)

| File | Change | Value |
|------|--------|-------|
| `extensions/tools/executors/editor.ts` | **Port:** `createLineDiff` rewritten | Trims common prefix/suffix; splits budget fairly. Fixes garbled str_replace diffs where lines mispair after insert/delete. |
| `extensions/tools/executors/editor.test.ts` | Tests for new diff algorithm | 3 tests pass |

### 1.2 VS Code Extension — Terminal Subsystem

| File | Change | Value |
|------|--------|-------|
| `hosts/vscode/terminal/VscodeTerminalManager.ts` | Checked out from upstream | Terminal process lifecycle, shell detection improvements |
| `hosts/vscode/terminal/VscodeTerminalProcess.ts` | Checked out from upstream | OSC 633 sequence handling, exit code tracking, timeout improvements |
| `hosts/vscode/terminal/osc633Parser.ts` | **New** | Parses VS Code's OSC 633 terminal sequences for reliable command start/end detection |
| `hosts/vscode/terminal/shellPromptHeuristics.ts` | **New** | Fallback shell prompt detection when OSC 633 is unavailable |
| `integrations/terminal/types.ts` | Checked out from upstream | Updated `ITerminalProcess` interface with detach capability |
| `integrations/terminal/constants.ts` | Checked out from upstream | New constants (`MAX_UNRETRIEVED_LINES`, etc.) |
| `utils/shell.ts` | Checked out from upstream | Windows shell detection fix |
| `utils/powershell.ts` | Checked out from upstream | PowerShell execution improvements |
| `core/hooks/HookProcess.ts` | Checked out from upstream | Hook execution updates |
| `core/controller/state/updateTerminalConnectionTimeout.ts` | Checked out from upstream | Terminal timeout configuration |
| `core/controller/ui/setTerminalExecutionMode.ts` | Checked out from upstream | Terminal mode UI logic |

**Deleted (replaced by OSC 633):**
- `integrations/terminal/CommandOrchestrator.ts`
- `integrations/terminal/CommandOrchestrator.test.ts`
- `integrations/terminal/__tests__/CommandOrchestrator.commandOutputAsk.test.ts`
- `types/vscode-language-model.d.ts`

### 1.3 VS Code Extension — SDK Coordinators

| File | Change | Value |
|------|--------|-------|
| `sdk/sdk-followup-coordinator.ts` | Checked out from upstream | Follow-up task handling |
| `sdk/sdk-mcp-coordinator.ts` | Checked out from upstream | MCP tool coordination |
| `sdk/sdk-task-control-coordinator.ts` | Checked out from upstream | Task lifecycle + legacy task warning on resume |
| `sdk/tool-approval-denial.ts` | Checked out from upstream | Tool approval/denial fixes |
| `sdk/sdk-tool-policies.ts` | Checked out from upstream | Tool policy updates |
| `sdk/state-post-debouncer.ts` | **New** | Coalesces `postStateToWebview()` bursts into single trailing flush; fixes listSessions hot loop. Ready for wiring. |
| `sdk/legacy-task-handling.ts` | **New** | Refactored legacy API→SDK message conversion helpers. Ready for wiring. |

### 1.4 VS Code Extension — Model Catalog

| File | Change | Value |
|------|--------|-------|
| `sdk/model-catalog/catalog.test.ts` | Checked out from upstream | Test updates |
| `sdk/model-catalog/contracts.ts` | Checked out from upstream | Catalog contract updates |
| `sdk/model-catalog/effective-config.ts` | Checked out from upstream | Effective config computation |
| `sdk/model-catalog/fingerprint.ts` | Checked out from upstream | Provider fingerprinting |
| `sdk/model-catalog/host-overrides.ts` | Checked out from upstream | Host-side model overrides |
| `sdk/model-catalog/provider-id.ts` | Checked out from upstream | Provider ID normalization |
| `sdk/model-catalog/store.ts` | Checked out from upstream | Catalog store improvements |
| `core/controller/models/resolveModelInfo.ts` | Checked out from upstream | Model info resolution |
| `core/controller/models/refreshOpenAiModels.ts` | Checked out from upstream | OpenAI model refresh |
| `core/controller/models/refreshGroqModels.ts` | Checked out from upstream | Groq model refresh fix |
| `core/workspace/WorkspaceRootManager.ts` | Checked out from upstream | Workspace root management |

### 1.5 VS Code Extension — Webview

| File | Change | Value |
|------|--------|-------|
| `webview-ui/.../history/HistoryPreview.tsx` | Checked out from upstream | Legacy badge, minor UI polish |
| `webview-ui/.../history/HistoryViewItem.tsx` | Checked out from upstream | Legacy badge |
| `webview-ui/.../onboarding/useOnboardingModels.ts` | Checked out from upstream | Onboarding model selection |
| `webview-ui/.../ClineModelPicker.test.tsx` | Checked out from upstream | Tests |
| `webview-ui/.../APIOptions.spec.tsx` | Checked out from upstream | Tests |

### 1.6 VS Code Extension — Shared / Utils

| File | Change | Value |
|------|--------|-------|
| `shared/storage/state-keys.ts` | **Manual:** terminal default → `backgroundExec` | Matches CLI behavior |
| `shared/api.ts` | Checked out from upstream | API type updates |
| `shared/HistoryItem.ts` | Checked out from upstream | History item updates |
| `shared/utils/cline.ts` | Checked out from upstream | Utility updates |
| `shared/net.ts` | Restored to fork version | Fork's proxy config preserved |
| `services/error/ClineError.ts` | Restored to fork version | Fork's error handling preserved |
| `services/telemetry/rollout-metadata.ts` | **New** | Extension variant type definitions |

### 1.7 Manual Fixes

| File | Fix | Commit |
|------|-----|--------|
| `sdk-task-start-coordinator.ts` | Guard `if (prompt?.trim() || images?.length || files?.length)`; `prompt || ""` | `845ed6977a` |
| `state-keys.ts` | Default terminal mode → `backgroundExec` | `845ed6977a` |
| `sdk-task-history.ts` | Added `isLegacyTask()` method | `f2c7cfacdc` |

---

## 2. What Was Skipped (And Why)

### 2.1 SDK Packages (~143 modified files + ~20 new files)

**Reason:** Upstream SDK packages (`@cline/shared`, `@cline/core`, `@cline/llms`) have diverged significantly. They export new types, functions, and depend on new dependencies (`ai-sdk-ollama`). Direct checkout breaks the fork's build.

**Key changes skipped:**

| Area | Upstream Changes | Impact |
|------|-----------------|--------|
| **Core types** | `types.ts`, `types/config.ts`, `types/session.ts`, `types/sessions.ts` | New fields (`legacyTask`, `temperature`, `defaultedMaxTokens`) |
| **Compaction** | `basic-compaction.ts`, `compaction.ts`, `compaction-shared.ts`, `agentic-compaction.ts` | Budget projection subsystem, first-prompt truncation fix |
| **Tools** | `definitions.ts`, `index.ts`, `types.ts`, `schemas.ts`, `helpers.ts` | `coalesceOrphanReadRanges` export, new tool definitions |
| **LLMs** | `ai-sdk.ts`, `gateway.ts`, `compat.ts`, `builtins.ts`, `ollama.ts` | Ollama `ai-sdk` provider, request headers, max token handling |
| **Shared** | `index.ts`, `tokens.ts`, `parse/string.ts`, `parse/shell.ts` | `stripUtf8Bom`, `decodeJwtPayload`, `estimateRequestInputTokens` |
| **Auth** | `auth/cline.ts`, `auth/codex.ts`, `auth/oca.ts` | Cline account service updates |

**Dependencies added upstream but not in fork's lockfile:**
- `ai-sdk-ollama` (llms package)

### 2.2 SDK-Dependent VS Code Files

**Reason:** These files were modified upstream to import from new SDK exports. Fork's SDK doesn't have these exports.

| File | What It Needs | Workaround |
|------|--------------|------------|
| `SdkController.ts` | `StatePostDebouncer`, `SdkForegroundCommandCoordinator`, `VscodeTerminalExecutionMode` | Manual diff port to fork's customized controller |
| `vscode-run-commands-tool.ts` | `CommandExitError` from `@cline/core`, `SdkForegroundCommandCoordinator` | Skip until foreground coordinator exists |
| `vscode-session-host.ts` | Updated `SessionHost` interface | Skip |
| `sdk-interaction-coordinator.ts` | Updated tool approval APIs | Skip |
| `sdk-user-message-mapping.ts` | `stripModeNotices` from `@cline/shared` | Need shared SDK rebuild |
| `sdk-compaction.ts` | `createSessionCompactionState` from `@cline/core` | Need core SDK rebuild |
| `sdk-session-lifecycle.ts` | `formatModeSwitchNotice` from `@cline/shared` | Need shared SDK rebuild |
| `sdk-task-history.ts` | Full `legacy-task-handling.ts` integration | Partial (`isLegacyTask` added) |
| `session-host.ts` | Updated host interface | Skip |
| `model-catalog/store.ts` | `readModelsFileSync` from `@cline/core` | Need core SDK rebuild |
| `model-catalog/host-overrides.ts` | `OLLAMA_DEFAULT_CONTEXT_WINDOW` from `@cline/llms` | Need llms SDK rebuild |
| `telemetry/TelemetryService.ts` | `rollout-metadata` integration | Partial (types file created) |

### 2.3 Coupled Refactors

**Reason:** Too many interdependent files across multiple packages.

| Refactor | Files | Why Skipped | Effort to Port |
|----------|-------|-------------|----------------|
| **Editor Diff Preview** (`EditPreview` abstraction) | 25 files (7 new + 18 modified) | Overlaps with fork's edit review system. `host-provider.ts`, `SdkController.ts`, `extension.ts` all need updates. | High |
| **Proceed While Running** (`SdkForegroundCommandCoordinator`) | ~10 files | Depends on `VscodeTerminalExecutionMode`, `proceedWhileRunningCommand.ts`, and SdkController changes | Medium |
| **Terminal Execution Mode** (`sdk-terminal-execution-mode-coordinator`) | ~8 files | Part of the OSC 633 refactoring | Medium |
| **Session Rebuild Scheduler** (`sdk-session-rebuild-scheduler`) | ~5 files | Depends on SdkController integration | Low |

### 2.4 Upstream-Only Features

**Reason:** Cline backend services that the fork doesn't have.

| Feature | Files | Notes |
|---------|-------|-------|
| ClinePass model subscription | `ClinePassLimitError.tsx`, `cline-pass-errors.ts`, `cline-pass.test.ts` | Requires Cline account service |
| A/B rollout infrastructure | `vscode-rollout/` (entire directory) | Requires Cline's staging infrastructure |
| Live model catalog | `catalog-live.ts` | Requires Cline's API server |
| Telemetry services | `sdk-telemetry.ts`, `telemetry-events.ts` | Fork may want to re-enable selectively |
| Cline Hub integration | `cline-hub/` (entire app) | Separate application |

### 2.5 Documentation

**Reason:** Upstream Cline docs not relevant to LingInk fork's branding.

| Area | Files |
|------|-------|
| Docs content | 40+ `.mdx` files in `docs/` (getting-started, provider-config, features, etc.) |
| README updates | `README.md`, `apps/cli/README.md` |
| Marketplace descriptions | `README.marketplace.md` |

---

## 3. Remaining Work (Prioritized)

### Phase 1 — Immediate (Hours, Not Days)

These complete the current batch of safely-portable fixes:

| Priority | Task | Files | Prerequisites |
|----------|------|-------|--------------|
| P0 | **Wire `state-post-debouncer.ts` into `SdkController.ts`** | `SdkController.ts` | Add `StatePostDebouncer` import, constructor init, `dispose()` call, rename `postStateToWebview` → `flushStateToWebview` |
| P0 | **Wire `legacy-task-handling.ts` into `sdk-task-history.ts`** | `sdk-task-history.ts` | Replace inline `legacyApiHistoryToSdkMessages`, `appendLegacyResumeWarning` with imports from new file |
| P1 | **Create `sdk-foreground-command-coordinator.ts`** | 1 new file | Port from upstream — standalone file, no SDK deps |
| P1 | **Create `proceedWhileRunningCommand.ts`** | 1 new file | Standalone gRPC handler |

### Phase 2 — Short-Term (1-2 Days)

These port impactful bug fixes without full SDK rebuild:

| Priority | Task | Files | Prerequisites |
|----------|------|-------|--------------|
| P1 | **Port shell detection to `vscode-run-commands-tool.ts`** | `vscode-run-commands-tool.ts` | Requires `SdkForegroundCommandCoordinator` |
| P2 | **Port compaction fixes** | `compaction.ts`, `basic-compaction.ts` | SDK core files — check if fork's compaction logic is compatible |
| P2 | **Port model catalog store updates** | `store.ts`, `host-overrides.ts` | Need to understand upstream's new export requirements |
| P2 | **Add `sdk-session-rebuild-scheduler.ts`** | 1 new file | Standalone, wires into SDK session lifecycle |

### Phase 3 — Long-Term (Days to Weeks)

These require architectural decisions:

| Priority | Task | Effort | Description |
|----------|------|--------|-------------|
| P2 | **Full SDK rebuild** | 2-3 days | Reset `@cline/shared`, `@cline/core`, `@cline/llms` to upstream, then fix all broken imports in LingInk's codebase |
| P3 | **Adopt `EditPreview` abstraction** | 1-2 days | Replace fork's edit review with upstream's approach, or merge both |
| P3 | **Re-evaluate ClinePass/Tencent TokenHub** | 0.5 day | These provider additions may benefit LingInk's Chinese-speaking users |
| P3 | **Re-enable telemetry** | 0.5 day | Wire `rollout-metadata.ts` into fork's telemetry service |
| P4 | **Update CI/CD workflows** | 0.5 day | New upstream workflows for nightly publishing, SDK release |

---

## 4. How to Continue Future Syncs

### Strategy: File-by-File diff porting (Recommended)

Rather than periodic bulk syncs, port individual upstream fixes as they're identified:

```
git diff <fork-baseline>..upstream/main -- <file>  # view diff
# apply only the relevant lines to fork's version
```

### When to do a full SDK sync

The SDK packages should be fully synchronized when:
1. A security vulnerability is fixed in the SDK
2. A new feature you want depends on new SDK exports
3. The fork's SDK falls more than ~500 commits behind
4. Before a major LingInk release

### Bash Commands for Future Syncs

```bash
# List new upstream commits since last sync
git log --oneline <last-sync-commit>..upstream/main

# Show files changed in a specific commit
git show --name-status <commit>

# Check if file is safe to checkout (no new SDK deps)
git show upstream/main:<file> | grep -oP 'from\s+"[^"]*"' | grep -v '\.\./'

# Port specific diff
git diff <fork-baseline>..upstream/main -- <file> | apply-selectively

# Reset SDK to fork baseline (if sync goes wrong)
git checkout <working-fork-commit> -- sdk/
```

---

## 5. Technical Debt

| Item | Notes |
|------|-------|
| `CommandOrchestrator.ts` deleted — OSC 633 parser replaces it | Complete |
| `.analysis/` directory in `.gitignore` | Complete |
| Unused `legacy-task-handling.ts` (not wired yet) | File exists, needs to be imported by `sdk-task-history.ts` |
| Unused `state-post-debouncer.ts` (not wired yet) | File exists, needs to be imported by `SdkController.ts` |
| `rollout-metadata.ts` created but not imported | Trivial, import when needed |
| `sdk-task-history.ts` has both inline and file-based legacy handling | Clean up: either import `legacy-task-handling.ts` or delete it |
