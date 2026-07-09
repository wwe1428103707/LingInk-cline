---
name: lingink-vscode-shortcuts
description: Add, debug, or review LingInk VS Code extension shortcut features, including command-palette commands, editor context-menu actions, webview Quick Win cards, bundled-skill assistant prompts, package.json contributions, registry wiring, localization, and tests. Use when changing apps/vscode shortcuts or when a VS Code plugin startup error may be caused by missing command contribution/registration wiring.
---

# LingInk VS Code Shortcuts

Use this skill when adding or debugging a shortcut-like entry point in the LingInk VS Code extension.

## Command Wiring Checklist

Keep command IDs synchronized across all required surfaces:

1. Add the command ID to `apps/vscode/src/registry.ts` under `ClineCommands`.
2. Add a `contributes.commands` entry in `apps/vscode/package.json`.
3. Add matching titles in `apps/vscode/package.nls.json` and `apps/vscode/package.nls.zh-cn.json`.
4. Register the handler in `apps/vscode/src/extension.ts` with `vscode.commands.registerCommand(...)`.
5. Add menu placement only when needed:
   - `menus.editor/context` for selected-text actions.
   - `menus.commandPalette` only for commands that should be hidden or conditionally shown; plain contributed commands appear by default.
   - webview-only Quick Wins usually do not need package command entries.

Do not register a command from `ExtensionRegistryInfo.commands` until the registry key exists. Passing `undefined` to `vscode.commands.registerCommand` can break extension activation.

## Common Patterns

For editor selection shortcuts, follow the existing command-controller pattern:

- Create or reuse `apps/vscode/src/core/controller/commands/*WithCline.ts`.
- In `extension.ts`, call `getContextForCommand(range)` and return early if no editor/selection context is available.
- Start a task through the command helper (`controller.initTask(...)`) or fill chat input through `sendAddToInputEvent(...)` depending on the intended UX.

For assistant shortcuts that start a guided task:

- Put the canonical prompt in `extension.ts` if the command palette should start it directly.
- Prefix the prompt with a slash skill command when it must load a bundled skill, e.g. `/scientific-toolkit-skill ...`.
- Use `showWebview(false)` before `controller.initTask(prompt)` so the sidebar is visible and focused.

For webview Quick Wins:

- Add the item to `apps/vscode/webview-ui/src/components/welcome/quickWinTasks.ts`.
- Add icon mapping in `QuickWinCard.tsx` only if using a new icon key.
- Reuse the same canonical prompt text as the command-palette entry when both surfaces launch the same assistant.

For the homepage academic shortcut grid:

- Add the item to `apps/vscode/webview-ui/src/components/welcome/AcademicQuickTasks.tsx`.
- Import the Lucide icon directly in that component and set it on the `academicTasks` entry.
- Use the same slash-skill prompt as the command-palette entry when the shortcut launches a bundled-skill assistant.
- If the feature should appear across all first-run/home surfaces, update both `AcademicQuickTasks.tsx` and `quickWinTasks.ts`; these are separate lists.
- When renaming a card's slash shortcut, also update `apps/vscode/src/shared/slashCommands.ts` so the chat slash-command autocomplete and validation use the same name and description.

For bundled skill shortcuts:

- Add runtime-search directories in `apps/vscode/src/services/bundled-skills.ts`.
- If the skill should be installed into `.clinerules/skills`, add it to `INSTALLABLE_BUNDLED_SKILL_BUNDLES`.
- Copy single-skill roots into a named subdirectory; do not flatten their `SKILL.md` into the skills root.

## Failure Diagnosis

When a shortcut causes activation/startup errors, check these first:

- `registry.ts` has the command key used in `extension.ts`.
- `package.json` contributes the command ID used in `registry.ts`.
- `package.nls*.json` contains every `%command...%` title key referenced by `package.json`.
- `extension.ts` imports the command helper from the correct path.
- `registerCommand` is wrapped in `context.subscriptions.push(...)`.
- Tests cover command consistency for the new command ID.

The highest-risk bug is adding a handler in `extension.ts` before adding the registry key. That makes `commands.SomeShortcut` undefined and can fail activation.

## Validation

Run the narrow checks first:

```sh
cd apps/vscode
bunx --bun @biomejs/biome check --write --no-errors-on-unmatched --files-ignore-unknown=true <changed files>
bun test src/__tests__/package-manifest.test.ts
```

If webview files changed:

```sh
cd apps/vscode/webview-ui
bunx tsc --noEmit
```

`bun run check-types` also runs proto generation; if it fails before TypeScript with existing proto errors, report that separately and keep the narrower checks.
