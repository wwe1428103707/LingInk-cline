/**
 * EditingSessionService
 *
 * Top-level singleton service managing editing sessions.
 * Provides the custom EditorExecutor that intercepts SDK tool calls
 * and routes them into the current editing session.
 *
 * Following VS Code's IChatEditingService pattern.
 */

import * as fs from "fs/promises"
import * as path from "path"
import type { Disposable, Event } from "vscode"
import { commands, EventEmitter, Uri, window } from "vscode"
import type { EditReviewState } from "@/shared/ExtensionMessage"
import { Logger } from "@/shared/services/Logger"
import { EditingSession, type IEditingSession } from "./EditingSession"
import { EditReviewWebviewPanel } from "./EditReviewWebviewPanel"
import { ModifiedFileEntryState, ModifiedFileHunkState } from "./ModifiedFileEntry"

export interface EditInput {
	path: string
	old_text?: string | null
	new_text: string
	insert_line?: number | null
}

export type EditorExecutorFn = (input: EditInput, cwd: string, context: unknown) => Promise<string>

export class EditingSessionService implements Disposable {
	private static _instance: EditingSessionService | undefined

	private readonly _onDidChangeSession = new EventEmitter<IEditingSession | undefined>()
	readonly onDidChangeSession: Event<IEditingSession | undefined> = this._onDidChangeSession.event

	private _currentSession: EditingSession | undefined
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

	private constructor() {}

	get currentSession(): IEditingSession | undefined {
		return this._currentSession
	}

	createSession(): IEditingSession {
		const sessionId = `edit-session-${++this._sessionCounter}`
		const session = new EditingSession(sessionId)
		this._currentSession = session
		this._onDidChangeSession.fire(session)
		Logger.log(`[EditingSessionService] Created session ${sessionId}`)
		return session
	}

	createEditorExecutor(): EditorExecutorFn {
		return async (input: EditInput, cwd: string, _context: unknown): Promise<string> => {
			const isAbsolute = input.path.startsWith("/") || /^[A-Za-z]:[\\/]/.test(input.path)
			const filePath = isAbsolute ? input.path : path.resolve(cwd, input.path)
			const relPath = path.relative(cwd, filePath).replace(/\\/g, "/")

			if (!this._currentSession || this._currentSession.state !== "collecting") {
				this.createSession()
				this._currentSession?.startCollecting()
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
	}

	async reject(filePath?: string): Promise<void> {
		this.finishCollectingIfNeeded()
		const session = this._currentSession
		if (!session || session.state !== "reviewing") {
			return
		}
		await session.reject(...(filePath ? [filePath] : []))
	}

	async acceptHunk(hunkId: string): Promise<void> {
		this.finishCollectingIfNeeded()
		const session = this._currentSession
		if (!session || session.state !== "reviewing") {
			return
		}
		await session.acceptHunk(hunkId)
	}

	async rejectHunk(hunkId: string): Promise<void> {
		this.finishCollectingIfNeeded()
		const session = this._currentSession
		if (!session || session.state !== "reviewing") {
			return
		}
		await session.rejectHunk(hunkId)
	}

	async openDiff(filePath: string): Promise<void> {
		const session = this._currentSession
		const entry = session?.getEntry(filePath)
		if (!entry) {
			window.showInformationMessage("未找到这个文件的审阅记录。")
			return
		}

		const ext = path.extname(entry.filePath)
		const baseName = path.basename(entry.filePath, ext)
		const tempDir = path.join(path.dirname(entry.filePath), ".lingink-review")
		await fs.mkdir(tempDir, { recursive: true })
		const originalPath = path.join(tempDir, `${baseName}.original${ext}`)
		await fs.writeFile(originalPath, entry.originalContent, "utf-8")

		await commands.executeCommand(
			"vscode.diff",
			Uri.file(originalPath),
			Uri.file(entry.filePath),
			`${entry.relPath}: 原文 ↔ LingInk 修改`,
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

	dispose(): void {
		if (this._currentSession) {
			this._currentSession.reset()
			this._currentSession = undefined
		}
		this._reviewPanel.dispose()
		this._onDidChangeSession.dispose()
	}
}

function fileExists(filePath: string): Promise<boolean> {
	return fs.access(filePath).then(
		() => true,
		() => false,
	)
}

function countLineDelta(originalContent: string, modifiedContent: string): { insertions: number; deletions: number } {
	const originalLines = originalContent.length > 0 ? originalContent.split("\n").length : 0
	const modifiedLines = modifiedContent.length > 0 ? modifiedContent.split("\n").length : 0
	return {
		insertions: Math.max(0, modifiedLines - originalLines),
		deletions: Math.max(0, originalLines - modifiedLines),
	}
}
