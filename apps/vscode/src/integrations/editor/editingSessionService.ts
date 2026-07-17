/**
 * EditingSessionService
 *
 * Top-level singleton service managing editing sessions.
 * Provides the custom EditorExecutor that intercepts SDK tool calls
 * and routes them into the current editing session.
 *
 * Following VS Code's IChatEditingService pattern:
 * - Original snapshots are served to the built-in diff editor through a
 *   TextDocumentContentProvider, so the review diff is computed by VS Code's
 *   own diff engine and always reflects the real changes on disk.
 * - A session survives across agent turns while it still has un-reviewed
 *   edits, mirroring how chat editing keeps pending changes in one session.
 */

import * as diff from "diff"
import * as fs from "fs/promises"
import * as path from "path"
import type { Disposable, Event, Tab } from "vscode"
import { commands, EventEmitter, TabInputTextDiff, Uri, window, workspace } from "vscode"
import type { EditReviewState } from "@/shared/ExtensionMessage"
import { Logger } from "@/shared/services/Logger"
import { EditingSession, type IEditingSession } from "./EditingSession"
import { EditReviewWebviewPanel } from "./EditReviewWebviewPanel"
import { type IModifiedFileEntry, ModifiedFileEntryState, ModifiedFileHunkState } from "./ModifiedFileEntry"

export interface EditInput {
	path: string
	old_text?: string | null
	new_text: string
	insert_line?: number | null
}

export type EditorExecutorFn = (input: EditInput, cwd: string, context: unknown) => Promise<string>

/**
 * URI scheme serving the pre-edit snapshot of each reviewed file to the
 * built-in diff editor (left side). The right side is the real file on disk,
 * so the diff editor computes the true, complete diff — no temp files.
 */
const REVIEW_DIFF_SCHEME = "lingink-edit-review"

/** Context key: true while the active editor shows a file with pending reviewed edits. */
const REVIEW_FILE_CONTEXT_KEY = "lingink.editReviewFileActive"

/** Above this combined size, insertion/deletion stats fall back to a cheap heuristic. */
const MAX_DIFF_STATS_CHARS = 1_000_000

export class EditingSessionService implements Disposable {
	private static _instance: EditingSessionService | undefined

	private readonly _onDidChangeSession = new EventEmitter<IEditingSession | undefined>()
	readonly onDidChangeSession: Event<IEditingSession | undefined> = this._onDidChangeSession.event

	private _currentSession: EditingSession | undefined
	private _sessionDisposables: Disposable[] = []
	private readonly _disposables: Disposable[] = []
	/** Pre-edit snapshots keyed by absolute file path, served by the review content provider. */
	private readonly _originalContentByPath = new Map<string, string>()
	private readonly _reviewPanel = new EditReviewWebviewPanel({
		getReviewState: () => this.getReviewState(),
		accept: (filePath) => this.accept(filePath),
		reject: (filePath) => this.reject(filePath),
		acceptHunk: (hunkId) => this.acceptHunk(hunkId),
		rejectHunk: (hunkId) => this.rejectHunk(hunkId),
		openDiff: (filePath) => this.openDiff(filePath),
	})
	private _sessionCounter = 0

	static getInstance(): EditingSessionService {
		if (!EditingSessionService._instance) {
			EditingSessionService._instance = new EditingSessionService()
		}
		return EditingSessionService._instance
	}

	static disposeInstance(): void {
		EditingSessionService._instance?.dispose()
		EditingSessionService._instance = undefined
	}

	private constructor() {
		this._registerReviewContentProvider()
		this._registerActiveEditorTracking()
	}

	get currentSession(): IEditingSession | undefined {
		return this._currentSession
	}

	createSession(): IEditingSession {
		for (const disposable of this._sessionDisposables) {
			disposable.dispose()
		}
		this._sessionDisposables = []
		const sessionId = `edit-session-${++this._sessionCounter}`
		const session = new EditingSession(sessionId)
		this._currentSession = session
		this._sessionDisposables.push(session.onDidChangeState(() => this._updateReviewContext()))
		this._onDidChangeSession.fire(session)
		Logger.log(`[EditingSessionService] Created session ${sessionId}`)
		return session
	}

	createEditorExecutor(): EditorExecutorFn {
		return async (input: EditInput, cwd: string, _context: unknown): Promise<string> => {
			const isAbsolute = input.path.startsWith("/") || /^[A-Za-z]:[\\/]/.test(input.path)
			const filePath = isAbsolute ? input.path : path.resolve(cwd, input.path)
			const relPath = path.relative(cwd, filePath).replace(/\\/g, "/")

			if (!this._currentSession || this._currentSession.state === "idle" || this._currentSession.state === "completed") {
				this.createSession()
				this._currentSession?.startCollecting()
			} else if (this._currentSession.state === "reviewing") {
				// The previous turn's edits are still awaiting review. Keep collecting
				// into the same session instead of silently dropping the pending review
				// (which orphaned the backups and made those edits impossible to undo).
				this._currentSession.resumeCollecting()
			}

			const session = this._currentSession
			if (!session) {
				throw new Error("Failed to create editing session")
			}

			if (input.insert_line != null) {
				const existingContent = await fs.readFile(filePath, "utf-8")
				const lines = existingContent.split("\n")
				const insertLine = input.insert_line - 1
				lines.splice(insertLine, 0, ...input.new_text.split("\n"))
				await session.queueWrite(filePath, relPath, lines.join("\n"))
			} else if (!(await fileExists(filePath))) {
				await session.queueWrite(filePath, relPath, input.new_text)
			} else if (input.old_text != null) {
				await session.queueEdit(filePath, relPath, input.old_text, input.new_text ?? "")
			} else {
				throw new Error("Parameter `old_text` is required when editing an existing file without `insert_line`")
			}

			Logger.log(`[EditingSessionService] Queued edit for ${relPath}`)
			return `已为 ${relPath} 加入编辑审阅。修改将在审阅后决定是否保留。`
		}
	}

	finishCollectingIfNeeded(): void {
		const session = this._currentSession
		if (session?.state === "collecting") {
			session.finishCollecting()
			this._updateReviewContext()
			this.openReviewPanel()
		}
	}

	getReviewState(): EditReviewState | undefined {
		const session = this._currentSession
		if (!session || session.state === "idle" || session.state === "completed") {
			return undefined
		}

		const files = [...session.entries]
			.filter((e) => e.state === ModifiedFileEntryState.Modified)
			.map((entry) => {
				const { insertions, deletions } = countLineDelta(entry.originalContent, entry.modifiedContent)
				return {
					entryId: entry.entryId,
					filePath: entry.filePath,
					relPath: entry.relPath,
					insertions,
					deletions,
					hunks: entry.hunks
						.filter((hunk) => hunk.state === ModifiedFileHunkState.Modified)
						.map((hunk) => ({
							hunkId: hunk.hunkId,
							filePath: hunk.filePath,
							relPath: hunk.relPath,
							oldText: hunk.oldText,
							newText: hunk.newText,
							state: hunk.state,
						})),
				}
			})

		if (files.length === 0) {
			return undefined
		}

		return {
			sessionId: session.sessionId,
			state: session.state === "collecting" ? "collecting" : "reviewing",
			files,
		}
	}

	async accept(filePath?: string): Promise<void> {
		this.finishCollectingIfNeeded()
		const session = this._currentSession
		if (!session || session.state !== "reviewing") {
			return
		}
		await session.accept(...(filePath ? [filePath] : []))
		await this._afterEntriesResolved(filePath)
	}

	async reject(filePath?: string): Promise<void> {
		this.finishCollectingIfNeeded()
		const session = this._currentSession
		if (!session || session.state !== "reviewing") {
			return
		}
		await session.reject(...(filePath ? [filePath] : []))
		await this._afterEntriesResolved(filePath)
	}

	async acceptHunk(hunkId: string): Promise<void> {
		this.finishCollectingIfNeeded()
		const session = this._currentSession
		if (!session || session.state !== "reviewing") {
			return
		}
		await session.acceptHunk(hunkId)
		await this._afterHunksResolved(hunkId)
	}

	async rejectHunk(hunkId: string): Promise<void> {
		this.finishCollectingIfNeeded()
		const session = this._currentSession
		if (!session || session.state !== "reviewing") {
			return
		}
		await session.rejectHunk(hunkId)
		await this._afterHunksResolved(hunkId)
	}

	/** Accept pending edits for the file shown in the active editor (editor/title command path). */
	async acceptActiveFile(): Promise<void> {
		const entry = this._getActiveReviewedEntry()
		if (entry) {
			await this.accept(entry.filePath)
		}
	}

	/** Reject pending edits for the file shown in the active editor (editor/title command path). */
	async rejectActiveFile(): Promise<void> {
		const entry = this._getActiveReviewedEntry()
		if (entry) {
			await this.reject(entry.filePath)
		}
	}

	/**
	 * Open the built-in diff editor for a reviewed file: the left side is the
	 * pre-edit snapshot served by our content provider, the right side is the
	 * real file on disk. VS Code computes the true diff itself.
	 */
	async openDiff(filePath: string): Promise<void> {
		const session = this._currentSession
		const entry = session?.getEntry(filePath)
		if (!entry || entry.state !== ModifiedFileEntryState.Modified) {
			window.showInformationMessage("未找到这个文件的审阅记录。")
			return
		}

		this._originalContentByPath.set(entry.filePath, entry.originalContent)
		const originalUri = Uri.file(entry.filePath).with({ scheme: REVIEW_DIFF_SCHEME })
		await commands.executeCommand(
			"vscode.diff",
			originalUri,
			Uri.file(entry.filePath),
			`${entry.relPath}（修改前 ↔ LingInk 修改）`,
		)
	}

	async showReview(): Promise<void> {
		this.finishCollectingIfNeeded()
		if (!this.openReviewPanel()) {
			window.showInformationMessage("没有需要审阅的修改。")
		}
	}

	private openReviewPanel(): boolean {
		return this._reviewPanel.show()
	}

	private async _afterEntriesResolved(filePath?: string): Promise<void> {
		await this._closeReviewDiffTabs(filePath)
		if (filePath) {
			this._originalContentByPath.delete(filePath)
		}
		this._updateReviewContext()
		this._reviewPanel.refresh()
	}

	private async _afterHunksResolved(hunkId: string): Promise<void> {
		const entry = this._currentSession?.entries.find((item) => item.hunks.some((hunk) => hunk.hunkId === hunkId))
		if (entry && entry.state !== ModifiedFileEntryState.Modified) {
			// All hunks of this file are decided — close its diff editor as well.
			await this._afterEntriesResolved(entry.filePath)
			return
		}
		this._updateReviewContext()
		this._reviewPanel.refresh()
	}

	private _registerReviewContentProvider(): void {
		const register = workspace.registerTextDocumentContentProvider?.bind(workspace)
		if (typeof register !== "function") {
			return
		}
		this._disposables.push(
			register(REVIEW_DIFF_SCHEME, {
				provideTextDocumentContent: (uri: Uri) => this._originalContentByPath.get(uri.fsPath) ?? "",
			}),
		)
	}

	private _registerActiveEditorTracking(): void {
		if (typeof window.onDidChangeActiveTextEditor !== "function") {
			return
		}
		this._disposables.push(window.onDidChangeActiveTextEditor(() => this._updateReviewContext()))
	}

	private _getActiveReviewedEntry(): IModifiedFileEntry | undefined {
		const document = window.activeTextEditor?.document
		if (!document || document.uri.scheme !== "file") {
			return undefined
		}
		const entry = this._currentSession?.getEntry(document.uri.fsPath)
		return entry?.state === ModifiedFileEntryState.Modified ? entry : undefined
	}

	private _updateReviewContext(): void {
		if (typeof commands.executeCommand !== "function") {
			return
		}
		void commands.executeCommand("setContext", REVIEW_FILE_CONTEXT_KEY, this._getActiveReviewedEntry() !== undefined)
	}

	/** Close review diff editor tabs — one file, or every review diff tab when omitted. */
	private async _closeReviewDiffTabs(filePath?: string): Promise<void> {
		const tabGroups = window.tabGroups
		if (!tabGroups) {
			return
		}
		const tabsToClose: Tab[] = []
		for (const group of tabGroups.all) {
			for (const tab of group.tabs) {
				const input = tab.input
				if (input instanceof TabInputTextDiff && input.original.scheme === REVIEW_DIFF_SCHEME) {
					if (!filePath || input.modified.fsPath === filePath) {
						tabsToClose.push(tab)
					}
				}
			}
		}
		if (tabsToClose.length > 0) {
			await tabGroups.close(tabsToClose)
		}
	}

	dispose(): void {
		if (this._currentSession) {
			void this._currentSession
				.reset()
				.catch((error) => Logger.error("[EditingSessionService] Failed to reset session on dispose:", error))
			this._currentSession = undefined
		}
		this._originalContentByPath.clear()
		this._reviewPanel.dispose()
		for (const disposable of this._sessionDisposables) {
			disposable.dispose()
		}
		this._sessionDisposables = []
		for (const disposable of this._disposables) {
			disposable.dispose()
		}
		this._onDidChangeSession.dispose()
		void commands.executeCommand("setContext", REVIEW_FILE_CONTEXT_KEY, false)
	}
}

function fileExists(filePath: string): Promise<boolean> {
	return fs.access(filePath).then(
		() => true,
		() => false,
	)
}

function countLineDelta(originalContent: string, modifiedContent: string): { insertions: number; deletions: number } {
	if (originalContent.length + modifiedContent.length > MAX_DIFF_STATS_CHARS) {
		// Cheap fallback for very large files: line-count delta only.
		const originalLines = originalContent.length > 0 ? originalContent.split("\n").length : 0
		const modifiedLines = modifiedContent.length > 0 ? modifiedContent.split("\n").length : 0
		return {
			insertions: Math.max(0, modifiedLines - originalLines),
			deletions: Math.max(0, originalLines - modifiedLines),
		}
	}
	// Real per-line diff counts (jsdiff) — the same granularity the diff editor shows.
	let insertions = 0
	let deletions = 0
	for (const part of diff.diffLines(originalContent, modifiedContent)) {
		if (part.added) {
			insertions += part.count ?? 0
		} else if (part.removed) {
			deletions += part.count ?? 0
		}
	}
	return { insertions, deletions }
}
