/**
 * EditingSessionService
 *
 * Top-level singleton service managing editing sessions.
 * Provides the custom EditorExecutor that intercepts SDK tool calls
 * and routes them into the current editing session.
 *
 * Following VS Code's IChatEditingService pattern.
 */

import * as path from "path"
import type { Disposable, Event } from "vscode"
import { EventEmitter, window, commands, Uri } from "vscode"
import * as fs from "fs/promises"
import { Logger } from "@/shared/services/Logger"
import { EditingSession, type IEditingSession } from "./EditingSession"
import { ModifiedFileEntryState } from "./ModifiedFileEntry"

export interface EditInput {
	path: string
	old_text?: string | null
	new_text: string
	insert_line?: number | null
}

export type EditorExecutorFn = (
	input: EditInput,
	cwd: string,
	context: unknown,
) => Promise<string>

export class EditingSessionService implements Disposable {
	private static _instance: EditingSessionService | undefined

	private readonly _onDidChangeSession = new EventEmitter<IEditingSession | undefined>()
	readonly onDidChangeSession: Event<IEditingSession | undefined> = this._onDidChangeSession.event

	private _currentSession: EditingSession | undefined
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
		return async (
			input: EditInput,
			cwd: string,
			_context: unknown,
		): Promise<string> => {
			const isAbsolute = input.path.startsWith("/") || /^[A-Za-z]:[\\/]/.test(input.path)
			const filePath = isAbsolute ? input.path : path.resolve(cwd, input.path)
			const relPath = path.relative(cwd, filePath).replace(/\\/g, "/")

			if (!this._currentSession || this._currentSession.state !== "collecting") {
				this.createSession()
				this._currentSession!.startCollecting()
			}

			const session = this._currentSession!

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
			return `Edit queued for ${relPath}. Changes will be applied after review.`
		}
	}

	async showReview(): Promise<void> {
		const session = this._currentSession
		if (!session) {
			window.showInformationMessage("No editing session active.")
			return
		}

		session.finishCollecting()

		const modified = [...session.entries].filter(
			e => e.state === ModifiedFileEntryState.Modified,
		)

		if (modified.length === 0) {
			window.showInformationMessage("No modified files to review.")
			return
		}

		// Show a diff editor for each modified file
		const tempFiles: Uri[] = []
		for (const entry of modified) {
			const originalUri = Uri.file(entry.filePath)
			const ext = path.extname(entry.filePath)
			const baseName = path.basename(entry.filePath, ext)
			const tempDir = path.join(path.dirname(entry.filePath), ".lingink-review")
			await fs.mkdir(tempDir, { recursive: true })
			const tempPath = path.join(tempDir, `${baseName}.review${ext}`)
			await fs.writeFile(tempPath, entry.modifiedContent, "utf-8")
			const modifiedUri = Uri.file(tempPath)
			tempFiles.push(modifiedUri)

			await commands.executeCommand(
				"vscode.diff",
				originalUri,
				modifiedUri,
				`${entry.relPath}: Original ↔ Changes`,
			)
		}

		const acceptAll = "Accept All"
		const rejectAll = "Reject All"
		const pick = await window.showInformationMessage(
			`Review ${modified.length} file change(s). Use the diff editors to review each change.`,
			{ modal: false },
			acceptAll,
			rejectAll,
		)

		if (pick === acceptAll) {
			await this.acceptAll(session)
		} else if (pick === rejectAll) {
			await this.rejectAll(session)
		}

		for (const tempUri of tempFiles) {
			try {
				await fs.unlink(tempUri.fsPath)
			} catch {
				// Best effort cleanup
			}
		}
	}

	private async acceptAll(session: IEditingSession): Promise<void> {
		await session.accept()
		window.showInformationMessage("All changes accepted.")
	}

	private async rejectAll(session: IEditingSession): Promise<void> {
		await session.reject()
		window.showInformationMessage("All changes rejected.")
	}

	dispose(): void {
		if (this._currentSession) {
			this._currentSession.reset()
			this._currentSession = undefined
		}
		this._onDidChangeSession.dispose()
	}
}

function fileExists(filePath: string): Promise<boolean> {
	return fs.access(filePath).then(
		() => true,
		() => false,
	)
}
