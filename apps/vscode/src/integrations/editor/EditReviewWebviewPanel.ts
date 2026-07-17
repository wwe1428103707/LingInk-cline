import * as diff from "diff"
import * as vscode from "vscode"
import { getNonce } from "@/core/webview/getNonce"
import type { EditReviewHunk, EditReviewState } from "@/shared/ExtensionMessage"
import { Logger } from "@/shared/services/Logger"
import type { EditReviewAction } from "@/shared/WebviewMessage"

interface EditReviewWebviewPanelCallbacks {
	getReviewState(): EditReviewState | undefined
	accept(filePath?: string): Promise<void>
	reject(filePath?: string): Promise<void>
	acceptHunk(hunkId: string): Promise<void>
	rejectHunk(hunkId: string): Promise<void>
	openDiff(filePath: string): Promise<void>
}

interface DiffPart {
	value: string
	added?: boolean
	removed?: boolean
}

/**
 * Above this combined size, intra-hunk highlighting is skipped and the hunk is
 * shown as plain before/after text (jsdiff stays fast far below this).
 */
const MAX_DIFF_CHARS = 200_000

export class EditReviewWebviewPanel implements vscode.Disposable {
	private panel: vscode.WebviewPanel | undefined
	private readonly disposables: vscode.Disposable[] = []

	constructor(private readonly callbacks: EditReviewWebviewPanelCallbacks) {}

	show(): boolean {
		const review = this.callbacks.getReviewState()
		if (!review) {
			return false
		}
		const createWebviewPanel = vscode.window.createWebviewPanel?.bind(vscode.window)
		if (typeof createWebviewPanel !== "function") {
			return false
		}

		if (!this.panel) {
			this.panel = createWebviewPanel("lingink.editReview", "LingInk 编辑审阅", vscode.ViewColumn.Active, {
				enableScripts: true,
				retainContextWhenHidden: true,
			})
			this.panel.onDidDispose(
				() => {
					this.panel = undefined
				},
				undefined,
				this.disposables,
			)
			this.panel.webview.onDidReceiveMessage((message: unknown) => this.handleMessage(message), undefined, this.disposables)
		}

		this.panel.reveal(vscode.ViewColumn.Active, false)
		this.render(review)
		return true
	}

	refresh(): void {
		const review = this.callbacks.getReviewState()
		if (!review) {
			this.panel?.dispose()
			return
		}
		this.render(review)
	}

	dispose(): void {
		this.panel?.dispose()
		while (this.disposables.length) {
			this.disposables.pop()?.dispose()
		}
	}

	private async handleMessage(message: unknown): Promise<void> {
		const action = parseReviewAction(message)
		if (!action) {
			Logger.warn("[EditReviewWebviewPanel] Ignored invalid review action:", message)
			return
		}

		try {
			if (action.action === "acceptAll") {
				await this.callbacks.accept()
			} else if (action.action === "rejectAll") {
				await this.callbacks.reject()
			} else if (action.action === "accept") {
				await this.callbacks.accept(action.filePath)
			} else if (action.action === "reject") {
				await this.callbacks.reject(action.filePath)
			} else if (action.action === "openDiff") {
				await this.callbacks.openDiff(action.filePath)
			} else if (action.action === "acceptHunk") {
				await this.callbacks.acceptHunk(action.hunkId)
			} else if (action.action === "rejectHunk") {
				await this.callbacks.rejectHunk(action.hunkId)
			}

			this.refresh()
		} catch (error) {
			Logger.error("[EditReviewWebviewPanel] Failed to apply review action:", error)
			const showErrorMessage = vscode.window.showErrorMessage?.bind(vscode.window)
			showErrorMessage?.("应用审阅操作失败，请打开输出日志查看详情。")
		}
	}

	private render(review: EditReviewState): void {
		if (!this.panel) {
			return
		}
		const nonce = getNonce()
		this.panel.title = "LingInk 编辑审阅"
		this.panel.webview.html = renderReviewHtml(review, nonce)
	}
}

function parseReviewAction(message: unknown): EditReviewAction | undefined {
	if (!message || typeof message !== "object") {
		return undefined
	}

	const value = message as Partial<EditReviewAction>
	if (value.action === "acceptAll" || value.action === "rejectAll") {
		return { action: value.action }
	}

	if (
		(value.action === "accept" || value.action === "reject" || value.action === "openDiff") &&
		"filePath" in value &&
		typeof value.filePath === "string"
	) {
		return { action: value.action, filePath: value.filePath }
	}

	if (
		(value.action === "acceptHunk" || value.action === "rejectHunk") &&
		"hunkId" in value &&
		typeof value.hunkId === "string"
	) {
		return { action: value.action, hunkId: value.hunkId }
	}

	return undefined
}

function renderReviewHtml(review: EditReviewState, nonce: string): string {
	const totalHunks = review.files.reduce((sum, file) => sum + file.hunks.length, 0)
	const totalInsertions = review.files.reduce((sum, file) => sum + file.insertions, 0)
	const totalDeletions = review.files.reduce((sum, file) => sum + file.deletions, 0)
	const changeLabel = totalHunks > 0 ? `${totalHunks} 处文本修改` : `${review.files.length} 个文件有修改`

	return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
	<style nonce="${nonce}">
		:root { color-scheme: light dark; }
		* { box-sizing: border-box; }
		body {
			margin: 0;
			color: var(--vscode-foreground);
			background: var(--vscode-editor-background);
			font-family: var(--vscode-font-family);
			font-size: var(--vscode-font-size);
		}
		.header {
			position: sticky;
			top: 0;
			z-index: 1;
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 16px;
			padding: 14px 18px;
			border-bottom: 1px solid var(--vscode-editorGroup-border);
			background: var(--vscode-editor-background);
		}
		.title { min-width: 0; }
		h1 {
			margin: 0;
			font-size: 15px;
			font-weight: 600;
		}
		.meta {
			margin-top: 3px;
			color: var(--vscode-descriptionForeground);
			font-size: 12px;
		}
		.added { color: var(--vscode-gitDecoration-addedResourceForeground, #2ea043); }
		.removed { color: var(--vscode-gitDecoration-deletedResourceForeground, #f85149); }
		.actions {
			display: flex;
			align-items: center;
			gap: 8px;
			flex-wrap: wrap;
			justify-content: flex-end;
		}
		button {
			height: 28px;
			padding: 0 10px;
			border: 1px solid var(--vscode-button-border, transparent);
			border-radius: 3px;
			color: var(--vscode-button-foreground);
			background: var(--vscode-button-background);
			font: inherit;
			font-size: 12px;
			cursor: pointer;
		}
		button.secondary {
			color: var(--vscode-foreground);
			background: var(--vscode-button-secondaryBackground);
		}
		button.icon {
			width: 28px;
			padding: 0;
		}
		button:hover { background: var(--vscode-button-hoverBackground); }
		button.secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }
		main {
			max-width: 980px;
			margin: 0 auto;
			padding: 16px 18px 28px;
		}
		.file {
			margin-bottom: 14px;
			border: 1px solid var(--vscode-editorGroup-border);
			border-radius: 4px;
			overflow: hidden;
			background: var(--vscode-sideBar-background);
		}
		.file-header {
			display: flex;
			align-items: center;
			gap: 10px;
			padding: 9px 10px;
			border-bottom: 1px solid var(--vscode-editorGroup-border);
		}
		.path {
			min-width: 0;
			flex: 1;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			font-size: 12px;
			font-weight: 600;
		}
		.counts {
			display: flex;
			gap: 5px;
			font-size: 11px;
		}
		.hunks {
			display: grid;
			gap: 8px;
			padding: 10px;
		}
		.hunk {
			border: 1px solid color-mix(in srgb, var(--vscode-editorGroup-border), transparent 28%);
			border-radius: 4px;
			background: var(--vscode-editor-background);
		}
		.hunk-actions {
			display: flex;
			gap: 6px;
			justify-content: flex-end;
			padding: 8px 8px 0;
		}
		.diff-row {
			display: grid;
			grid-template-columns: 58px minmax(0, 1fr);
			gap: 10px;
			padding: 8px;
			border-top: 1px solid color-mix(in srgb, var(--vscode-editorGroup-border), transparent 45%);
		}
		.diff-row:first-child { border-top: 0; }
		.label {
			color: var(--vscode-descriptionForeground);
			font-size: 11px;
			line-height: 20px;
		}
		.text {
			min-width: 0;
			max-height: 170px;
			overflow: auto;
			white-space: pre-wrap;
			overflow-wrap: anywhere;
			line-height: 20px;
			font-family: var(--vscode-editor-font-family);
			font-size: var(--vscode-editor-font-size);
		}
		.token-added {
			border-radius: 2px;
			color: var(--vscode-gitDecoration-addedResourceForeground, #2ea043);
			background: var(--vscode-diffEditor-insertedTextBackground);
		}
		.token-removed {
			border-radius: 2px;
			color: var(--vscode-gitDecoration-deletedResourceForeground, #f85149);
			background: var(--vscode-diffEditor-removedTextBackground);
		}
		.empty {
			margin: 28px auto;
			max-width: 520px;
			color: var(--vscode-descriptionForeground);
			text-align: center;
		}
	</style>
</head>
<body>
	<header class="header">
		<div class="title">
			<h1>LingInk 编辑审阅</h1>
			<div class="meta">${escapeHtml(changeLabel)} · ${escapeHtml(review.files.length.toString())} 个文件${totalInsertions > 0 ? ` · <span class="added">+${totalInsertions}</span>` : ""}${totalDeletions > 0 ? ` · <span class="removed">-${totalDeletions}</span>` : ""}</div>
		</div>
		<div class="actions">
			<button data-action="acceptAll">全部保留</button>
			<button class="secondary" data-action="rejectAll">全部撤销</button>
		</div>
	</header>
	<main>${review.files.map(renderFile).join("") || `<div class="empty">没有需要审阅的修改。</div>`}</main>
	<script nonce="${nonce}">
		const vscode = acquireVsCodeApi();
		document.addEventListener("click", (event) => {
			const target = event.target;
			const element = target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
			const button = element?.closest("button[data-action]");
			if (!button) return;
			const message = { action: button.getAttribute("data-action") };
			const filePath = button.getAttribute("data-file-path");
			const hunkId = button.getAttribute("data-hunk-id");
			if (filePath) message.filePath = filePath;
			if (hunkId) message.hunkId = hunkId;
			vscode.postMessage(message);
		});
	</script>
</body>
</html>`
}

function renderFile(file: EditReviewState["files"][number]): string {
	return `<section class="file">
		<div class="file-header">
			<div class="path" title="${escapeAttr(file.relPath)}">${escapeHtml(file.relPath)}</div>
			<div class="counts">${file.insertions > 0 ? `<span class="added">+${file.insertions}</span>` : ""}${file.deletions > 0 ? `<span class="removed">-${file.deletions}</span>` : ""}</div>
			<button class="secondary" data-action="openDiff" data-file-path="${escapeAttr(file.filePath)}">打开差异视图</button>
			<button data-action="accept" data-file-path="${escapeAttr(file.filePath)}">保留文件</button>
			<button class="secondary" data-action="reject" data-file-path="${escapeAttr(file.filePath)}">撤销文件</button>
		</div>
		<div class="hunks">${file.hunks.map(renderHunk).join("") || `<div class="empty">这个文件是整文件写入。请使用“打开差异视图”、“保留文件”或“撤销文件”。</div>`}</div>
	</section>`
}

function renderHunk(hunk: EditReviewHunk): string {
	const parts = diffHunkText(hunk.oldText, hunk.newText)
	return `<article class="hunk">
		<div class="hunk-actions">
			<button data-action="acceptHunk" data-hunk-id="${escapeAttr(hunk.hunkId)}">保留</button>
			<button class="secondary" data-action="rejectHunk" data-hunk-id="${escapeAttr(hunk.hunkId)}">撤销</button>
		</div>
		<div class="diff-row">
			<div class="label">修改前</div>
			<div class="text">${renderDiffParts(
				parts.filter((part) => !part.added),
				"old",
			)}</div>
		</div>
		<div class="diff-row">
			<div class="label">修改后</div>
			<div class="text">${renderDiffParts(
				parts.filter((part) => !part.removed),
				"new",
			)}</div>
		</div>
	</article>`
}

function renderDiffParts(parts: DiffPart[], side: "old" | "new"): string {
	return parts
		.map((part) => {
			const changed = side === "old" ? part.removed : part.added
			const className = changed ? (side === "old" ? "token-removed" : "token-added") : ""
			return `<span${className ? ` class="${className}"` : ""}>${escapeHtml(part.value)}</span>`
		})
		.join("")
}

/**
 * Character-level diff of a hunk's before/after text.
 *
 * Uses jsdiff's Myers implementation — the same algorithm family as the
 * built-in diff editor — instead of a hand-rolled LCS. Character granularity
 * handles Chinese text correctly (the old word tokenizer capped out at 900
 * tokens, which a single CJK paragraph already exceeded, and fell back to
 * showing two undifferentiated blocks).
 */
function diffHunkText(oldText: string, newText: string): DiffPart[] {
	if (oldText.length + newText.length > MAX_DIFF_CHARS) {
		return [
			{ value: oldText, removed: true },
			{ value: newText, added: true },
		]
	}
	return diff.diffChars(oldText, newText).map((part) => ({
		value: part.value,
		added: part.added,
		removed: part.removed,
	}))
}

function escapeHtml(value: string): string {
	return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")
}

function escapeAttr(value: string): string {
	return escapeHtml(value).replace(/`/g, "&#96;")
}
