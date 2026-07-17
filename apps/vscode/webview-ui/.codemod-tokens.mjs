/* One-shot codemod: converge direct --vscode-* arbitrary-value COLOR utilities to theme tokens. */
import { execSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"

const map = new Map(
	Object.entries({
		"--vscode-foreground": "foreground",
		"--vscode-descriptionForeground": "description",
		"--vscode-errorForeground": "error",
		"--vscode-problemsErrorIcon-foreground": "error-icon",
		"--vscode-testing-iconFailed": "failed-icon",
		"--vscode-testing-iconPassed": "passed-icon",
		"--vscode-charts-green": "success",
		"--vscode-charts-yellow": "warning",
		"--vscode-textLink-foreground": "link",
		"--vscode-textLink-activeForeground": "link-hover",
		"--vscode-panel-border": "border-panel",
		"--vscode-focusBorder": "focus",
		"--vscode-editorGroup-border": "editor-group-border",
		"--vscode-editorWidget-border": "editor-widget-border",
		"--vscode-editorWarning-foreground": "editor-warning-foreground",
		"--vscode-editor-background": "code",
		"--vscode-editor-foreground": "code-foreground",
		"--vscode-editor-border": "code-border",
		"--vscode-textCodeBlock-background": "text-block-background",
		"--vscode-textBlockQuote-background": "quote",
		"--vscode-textBlockQuote-foreground": "quote-foreground",
		"--vscode-sideBar-background": "background",
		"--vscode-sideBar-foreground": "sidebar-foreground",
		"--vscode-input-foreground": "input-foreground",
		"--vscode-input-background": "input-background",
		"--vscode-input-border": "input-border",
		"--vscode-input-placeholderForeground": "input-placeholder",
		"--vscode-inputValidation-errorBackground": "input-error-background",
		"--vscode-inputValidation-errorForeground": "input-error-foreground",
		"--vscode-inputValidation-warningBackground": "input-warning-background",
		"--vscode-inputValidation-warningForeground": "input-warning-foreground",
		"--vscode-list-activeSelectionBackground": "selection",
		"--vscode-list-activeSelectionForeground": "selection-foreground",
		"--vscode-editor-inactiveSelectionBackground": "selection-inactive",
		"--vscode-list-hoverBackground": "list-hover",
		"--vscode-button-background": "button-background",
		"--vscode-button-hoverBackground": "button-hover",
		"--vscode-button-foreground": "button-foreground",
		"--vscode-button-separator": "button-separator",
		"--vscode-textSeparator-foreground": "text-separator",
		"--vscode-button-secondaryBackground": "button-secondary-background",
		"--vscode-button-secondaryHoverBackground": "button-secondary-background-hover",
		"--vscode-button-secondaryForeground": "button-secondary-foreground",
		"--vscode-menu-background": "menu",
		"--vscode-menu-foreground": "menu-foreground",
		"--vscode-menu-border": "menu-border",
		"--vscode-menu-shadow": "menu-shadow",
		"--vscode-textPreformat-foreground": "preformat",
		"--vscode-badge-foreground": "badge-foreground",
		"--vscode-badge-background": "badge-background",
		"--vscode-banner-background": "banner-background",
		"--vscode-banner-foreground": "banner-foreground",
		"--vscode-banner-iconForeground": "banner-icon",
		"--vscode-editor-findMatchHighlightBackground": "editor-match-highlight",
		"--vscode-icon-foreground": "icon-foreground",
		"--vscode-notificationsInfoIcon-foreground": "notification-foreground",
		"--vscode-toolbar-background": "toolbar-default",
		"--vscode-toolbar-hoverBackground": "toolbar-hover",
		"--vscode-diffEditor-insertedTextBackground": "diff-added",
		"--vscode-diffEditor-removedTextBackground": "diff-removed",
		"--vscode-widget-shadow": "shadow",
	}),
)

/* Legacy dead classes from the unloaded v3-era tailwind.config — convert to the live token. */
const legacy = {
	"text-vscode-textLink-foreground": "text-link",
	"border-vscode-textLink-foreground": "border-link",
	"bg-vscode-textBlockQuote-background": "bg-quote",
	"bg-vscode-input-background": "bg-input-background",
	"text-vscode-input-foreground": "text-input-foreground",
	"bg-vscode-inputValidation-warningBackground": "bg-input-warning-background",
	"border-vscode-input-border": "border-input-border",
	"border-vscode-widget-border": "border-editor-widget-border",
	"bg-list-background-hover": "bg-list-hover",
}

const EXCLUDE = new Set([
	"src/components/common/MermaidBlock.tsx",
	"src/components/chat/ChatTextArea.tsx",
	"src/components/chat/ChatView.tsx",
])

const files = execSync('git ls-files "src/**/*.tsx" "src/**/*.ts"', { encoding: "utf8" })
	.split("\n")
	.filter((f) => f && !EXCLUDE.has(f) && !f.startsWith("src/i18n/"))

const utils = "(?:text|bg|border|ring|stroke|fill|from|via|to)"
const patterns = [
	new RegExp(`(?<![\\w])(${utils})-\\[var\\(\\s*(--vscode-[A-Za-z0-9-]+)(?:\\s*,[^\\]]*)?\\)\\]`, "g"),
	new RegExp(`(?<![\\w])(${utils})-\\(var\\(\\s*(--vscode-[A-Za-z0-9-]+)(?:\\s*,[^)]*)?\\)\\)`, "g"),
	new RegExp(`(?<![\\w])(${utils})-\\((--vscode-[A-Za-z0-9-]+)(?:,[^)]*)?\\)`, "g"),
]

let total = 0
const perFile = []
for (const file of files) {
	let src = readFileSync(file, "utf8")
	const before = src
	let count = 0
	for (const re of patterns) {
		src = src.replace(re, (whole, util, varName) => {
			const token = map.get(varName)
			if (!token) return whole
			count++
			return `${util}-${token}`
		})
	}
	for (const [from, to] of Object.entries(legacy)) {
		const re = new RegExp(`(?<![\\w/-])${from.replaceAll("-", "\\-")}(?![\\w])`, "g")
		src = src.replace(re, () => {
			count++
			return to
		})
	}
	if (src !== before) {
		writeFileSync(file, src)
		perFile.push(`${file}: ${count}`)
		total += count
	}
}
console.log(perFile.join("\n"))
console.log(`TOTAL replacements: ${total} in ${perFile.length} files`)
