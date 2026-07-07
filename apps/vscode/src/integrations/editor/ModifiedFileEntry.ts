/**
 * ModifiedFileEntry
 *
 * Per-file editing state with accept/reject support.
 * Three-state lifecycle: Modified → Accepted | Rejected.
 *
 * Edits are written to the real file immediately so the agent's read_file
 * tool works correctly. On reject(), the original content is restored.
 * On accept(), the modified content is kept and original backup is cleaned up.
 */

import * as fs from "fs/promises"
import * as path from "path"
import type { Event } from "vscode"
import { EventEmitter } from "vscode"
import { Logger } from "@/shared/services/Logger"

export enum ModifiedFileEntryState {
	Modified = "modified",
	Accepted = "accepted",
	Rejected = "rejected",
}

export enum ModifiedFileHunkState {
	Modified = "modified",
	Accepted = "accepted",
	Rejected = "rejected",
}

export interface ModifiedFileHunk {
	readonly hunkId: string
	readonly filePath: string
	readonly relPath: string
	readonly oldText: string
	readonly newText: string
	readonly startOffset: number
	readonly state: ModifiedFileHunkState
	readonly createdAt: number
}

export interface IModifiedFileEntry {
	readonly entryId: string
	readonly filePath: string
	readonly relPath: string
	readonly state: ModifiedFileEntryState
	readonly originalContent: string
	readonly modifiedContent: string
	readonly hunks: readonly ModifiedFileHunk[]

	/** Accept the changes: keeps modified file on disk */
	accept(): Promise<void>

	/** Reject the changes: restores original content */
	reject(): Promise<void>

	/** Accept a single recorded text replacement hunk */
	acceptHunk(hunkId: string): Promise<void>

	/** Reject a single recorded text replacement hunk */
	rejectHunk(hunkId: string): Promise<void>

	/** Apply a text replacement edit and write to disk */
	applyEdit(oldText: string, newText: string): Promise<void>

	/** Replace entire content and write to disk (for write_to_file) */
	replaceContent(newContent: string): Promise<void>

	onDidChangeState: Event<ModifiedFileEntryState>
	onDidDispose: Event<void>
}

/**
 * Backup directory name inside the workspace for original file backups.
 */
const BACKUP_DIR_NAME = ".lingink-backup"

function backupPath(filePath: string): string {
	const dir = path.dirname(filePath)
	const base = path.basename(filePath)
	return path.join(dir, BACKUP_DIR_NAME, base)
}

export class ModifiedFileEntry implements IModifiedFileEntry {
	private readonly _onDidChangeState = new EventEmitter<ModifiedFileEntryState>()
	readonly onDidChangeState = this._onDidChangeState.event

	private readonly _onDidDispose = new EventEmitter<void>()
	readonly onDidDispose = this._onDidDispose.event

	private _state: ModifiedFileEntryState = ModifiedFileEntryState.Modified
	private readonly _originalContent: string
	private _modifiedContent: string
	private _hunks: ModifiedFileHunk[] = []
	private _backupWritten = false
	private _disposed = false

	constructor(
		readonly entryId: string,
		readonly filePath: string,
		readonly relPath: string,
		originalContent: string,
	) {
		this._originalContent = originalContent
		this._modifiedContent = originalContent
	}

	get state(): ModifiedFileEntryState {
		return this._state
	}

	get originalContent(): string {
		return this._originalContent
	}

	get modifiedContent(): string {
		return this._modifiedContent
	}

	get hunks(): readonly ModifiedFileHunk[] {
		return this._hunks
	}

	async applyEdit(oldText: string, newText: string): Promise<void> {
		if (this._disposed || this._state !== ModifiedFileEntryState.Modified) {
			return
		}
		await this._ensureBackup()

		const startOffset = this._modifiedContent.indexOf(oldText)
		if (startOffset === -1 && oldText !== newText) {
			throw new Error(`Could not find text to replace in ${this.relPath}`)
		}
		const nextContent =
			startOffset === -1
				? this._modifiedContent
				: this._modifiedContent.slice(0, startOffset) +
					newText +
					this._modifiedContent.slice(startOffset + oldText.length)
		this._modifiedContent = nextContent
		this._hunks.push({
			hunkId: generateHunkId(),
			filePath: this.filePath,
			relPath: this.relPath,
			oldText,
			newText,
			startOffset: Math.max(0, startOffset),
			state: ModifiedFileHunkState.Modified,
			createdAt: Date.now(),
		})
		await fs.writeFile(this.filePath, this._modifiedContent, "utf-8")
		Logger.log(`[ModifiedFileEntry] Applied edit on ${this.relPath}`)
	}

	async replaceContent(newContent: string): Promise<void> {
		if (this._disposed || this._state !== ModifiedFileEntryState.Modified) {
			return
		}
		await this._ensureBackup()

		this._modifiedContent = newContent
		await fs.mkdir(path.dirname(this.filePath), { recursive: true })
		await fs.writeFile(this.filePath, this._modifiedContent, "utf-8")
		Logger.log(`[ModifiedFileEntry] Replaced content for ${this.relPath}`)
	}

	async accept(): Promise<void> {
		if (this._disposed || this._state !== ModifiedFileEntryState.Modified) {
			return
		}
		this._hunks = this._hunks.map((hunk) =>
			hunk.state === ModifiedFileHunkState.Modified ? { ...hunk, state: ModifiedFileHunkState.Accepted } : hunk,
		)
		// Clean up backup
		await this._cleanupBackup()
		this._transitionTo(ModifiedFileEntryState.Accepted)
		Logger.log(`[ModifiedFileEntry] Accepted changes for ${this.relPath}`)
	}

	async reject(): Promise<void> {
		if (this._disposed || this._state !== ModifiedFileEntryState.Modified) {
			return
		}
		// Restore original content
		if (this._backupWritten) {
			const bkPath = backupPath(this.filePath)
			try {
				const backupContent = await fs.readFile(bkPath, "utf-8")
				await fs.writeFile(this.filePath, backupContent, "utf-8")
				await this._cleanupBackup()
			} catch (error) {
				Logger.error(`[ModifiedFileEntry] Failed to restore backup for ${this.relPath}:`, error)
			}
		}
		this._modifiedContent = this._originalContent
		this._hunks = this._hunks.map((hunk) =>
			hunk.state === ModifiedFileHunkState.Modified ? { ...hunk, state: ModifiedFileHunkState.Rejected } : hunk,
		)
		this._transitionTo(ModifiedFileEntryState.Rejected)
		Logger.log(`[ModifiedFileEntry] Rejected changes for ${this.relPath}`)
	}

	async acceptHunk(hunkId: string): Promise<void> {
		if (this._disposed || this._state !== ModifiedFileEntryState.Modified) {
			return
		}

		this._hunks = this._hunks.map((hunk) =>
			hunk.hunkId === hunkId && hunk.state === ModifiedFileHunkState.Modified
				? { ...hunk, state: ModifiedFileHunkState.Accepted }
				: hunk,
		)
		await this._resolveIfNoPendingHunks()
		Logger.log(`[ModifiedFileEntry] Accepted hunk ${hunkId} for ${this.relPath}`)
	}

	async rejectHunk(hunkId: string): Promise<void> {
		if (this._disposed || this._state !== ModifiedFileEntryState.Modified) {
			return
		}

		const hunk = this._hunks.find((item) => item.hunkId === hunkId)
		if (!hunk || hunk.state !== ModifiedFileHunkState.Modified) {
			return
		}

		const currentOffset =
			this._modifiedContent.slice(hunk.startOffset, hunk.startOffset + hunk.newText.length) === hunk.newText
				? hunk.startOffset
				: this._modifiedContent.indexOf(hunk.newText)
		if (currentOffset === -1 && hunk.oldText !== hunk.newText) {
			throw new Error(`Could not undo edit hunk in ${this.relPath}`)
		}

		this._modifiedContent =
			currentOffset === -1
				? this._modifiedContent
				: this._modifiedContent.slice(0, currentOffset) +
					hunk.oldText +
					this._modifiedContent.slice(currentOffset + hunk.newText.length)
		const offsetDelta = hunk.oldText.length - hunk.newText.length
		this._hunks = this._hunks.map((item) =>
			item.hunkId === hunkId
				? { ...item, state: ModifiedFileHunkState.Rejected }
				: item.startOffset > currentOffset
					? { ...item, startOffset: Math.max(0, item.startOffset + offsetDelta) }
					: item,
		)
		await fs.writeFile(this.filePath, this._modifiedContent, "utf-8")
		await this._resolveIfNoPendingHunks()
		Logger.log(`[ModifiedFileEntry] Rejected hunk ${hunkId} for ${this.relPath}`)
	}

	private async _ensureBackup(): Promise<void> {
		if (this._backupWritten) {
			return
		}
		// Save original content to backup before first modification
		const bkPath = backupPath(this.filePath)
		await fs.mkdir(path.dirname(bkPath), { recursive: true })
		await fs.writeFile(bkPath, this._originalContent, "utf-8")
		this._backupWritten = true
	}

	private async _cleanupBackup(): Promise<void> {
		if (!this._backupWritten) {
			return
		}
		const bkPath = backupPath(this.filePath)
		try {
			await fs.unlink(bkPath)
		} catch {
			// Best effort cleanup
		}
		this._backupWritten = false
	}

	private _transitionTo(newState: ModifiedFileEntryState): void {
		this._state = newState
		this._onDidChangeState.fire(newState)
	}

	private async _resolveIfNoPendingHunks(): Promise<void> {
		if (this._hunks.length > 0 && this._hunks.every((hunk) => hunk.state !== ModifiedFileHunkState.Modified)) {
			await this._cleanupBackup()
			this._transitionTo(ModifiedFileEntryState.Accepted)
		}
	}

	async dispose(): Promise<void> {
		if (this._disposed) {
			return
		}
		// If still modified and not accepted/rejected, restore original
		if (this._state === ModifiedFileEntryState.Modified) {
			await this.reject()
		}
		this._disposed = true
		this._onDidDispose.fire()
		this._onDidChangeState.dispose()
		this._onDidDispose.dispose()
	}
}

let _nextEntryId = 1
export function generateEntryId(): string {
	return `entry-${_nextEntryId++}-${Date.now()}`
}

let _nextHunkId = 1
export function generateHunkId(): string {
	return `hunk-${_nextHunkId++}-${Date.now()}`
}
