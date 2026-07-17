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
 * - Pending reviews are persisted under the Cline data directory and restored
 *   on the next activation, like chatEditingSessionStorage.
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
import {
	clearEditReviewState,
	type EditReviewEntrySnapshot,
	loadEditReviewState,
	type PersistedEditReviewState,
	saveEditReviewState,
} from "./editReviewPersistence"
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

	/** Fires whenever the set of pending review entries may have changed. */
	private readonly _onDidChangeReviewState = new EventEmitter<void>()
	readonly onDidChangeReviewState: Event<void> = this._onDidChangeReviewState.event

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
	/** Workspace cwd of the most recent edit/restore — keys the persisted state file. */
	private _lastCwd: string | undefined
	/** Serializes state-file writes so out-of-order completions cannot clobber newer state. */
	private _persistQueue: Promise<void> = Promise.resolve()

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
			this._lastCwd = cwd

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

			this._queuePersistReviewState()
			this._onDidChangeReviewState.fire()
			Logger.log(`[EditingSessionService] Queued edit for ${relPath}`)
			return `已为 ${relPath} 加入编辑审阅。修改将在审阅后决定是否保留。`
		}
	}

	finishCollectingIfNeeded(): void {
		const session = this._currentSession
		if (session?.state === "collecting") {
			session.finishCollecting()
			this._updateReviewContext()
			this._queuePersistReviewState()
			this._onDidChangeReviewState.fire()
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

	/** Accept pending edits for the given file, or the file shown in the active editor. */
	async acceptActiveFile(filePath?: string): Promise<void> {
		const target = filePath ?? this._getActiveReviewedEntry()?.filePath
		if (target) {
			await this.accept(target)
		}
	}

	/** Reject pending edits for the given file, or the file shown in the active editor. */
	async rejectActiveFile(filePath?: string): Promise<void> {
		const target = filePath ?? this._getActiveReviewedEntry()?.filePath
		if (target) {
			await this.reject(target)
		}
	}

	/** The still-pending entry for a file, used by the decoration/CodeLens controller. */
	getPendingEntryForFile(filePath: string): IModifiedFileEntry | undefined {
		const entry = this._currentSession?.getEntry(filePath)
		return entry?.state === ModifiedFileEntryState.Modified ? entry : undefined
	}

	/**
	 * Restore a pending review persisted by a previous window/session for this
	 * workspace. Entries whose file no longer matches the persisted modified
	 * content (user edited or reverted externally) are dropped.
	 */
	async restorePersistedSession(cwd: string): Promise<void> {
		this._lastCwd = cwd
		if (this._currentSession && this._currentSession.entries.length > 0) {
			return
		}
		const state = await loadEditReviewState(cwd)
		if (!state || state.entries.length === 0) {
			return
		}

		const valid: EditReviewEntrySnapshot[] = []
		for (const entry of state.entries) {
			try {
				const diskContent = await fs.readFile(entry.filePath, "utf-8")
				if (diskContent === entry.modifiedContent) {
					valid.push(entry)
				} else {
					Logger.warn(`[EditingSessionService] Skipping restored review for ${entry.relPath}: file changed on disk`)
				}
			} catch {
				Logger.warn(`[EditingSessionService] Skipping restored review for ${entry.relPath}: file missing`)
			}
		}
		if (valid.length === 0) {
			await clearEditReviewState(cwd)
			return
		}

		this.createSession()
		const restored = this._currentSession?.restoreEntries(valid) ?? 0
		if (restored === 0) {
			return
		}
		Logger.log(`[EditingSessionService] Restored ${restored} pending review file(s) from a previous session`)
		this._updateReviewContext()
		this._onDidChangeReviewState.fire()
		const openLabel = "打开审阅"
		void window.showInformationMessage(`检测到 ${restored} 个文件有未审阅的 LingInk 修改。`, openLabel).then((choice) => {
			if (choice === openLabel) {
				void this.showReview()
			}
		})
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
		this._queuePersistReviewState()
		this._onDidChangeReviewState.fire()
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
		this._queuePersistReviewState()
		this._onDidChangeReviewState.fire()
		this._reviewPanel.refresh()
	}

	/**
	 * Persist the pending review (or clear the persisted file once nothing is
	 * pending). Writes are serialized so a slower earlier write cannot clobber
	 * newer state.
	 */
	private _queuePersistReviewState(): void {
		const cwd = this._lastCwd
		if (!cwd) {
			return
		}
		const session = this._currentSession
		const snapshots = session?.snapshotEntries() ?? []
		this._persistQueue = this._persistQueue.then(async () => {
			try {
				if (!session || snapshots.length === 0) {
					await clearEditReviewState(cwd)
					return
				}
				const state: PersistedEditReviewState = {
					version: 1,
					cwd,
					sessionId: session.sessionId,
					savedAt: Date.now(),
					entries: snapshots,
				}
				await saveEditReviewState(state)
			} catch (error) {
				Logger.error("[EditingSessionService] Failed to persist edit review state:", error)
			}
		})
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
		// Do NOT reset the session: pending edits stay on disk and the persisted
		// review state lets the next activation restore the review (VS Code chat
		// editing behaves the same way). The state file is already kept current
		// by eager persistence after every mutation.
		void this._persistQueue
		this._currentSession = undefined
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
		this._onDidChangeReviewState.dispose()
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
