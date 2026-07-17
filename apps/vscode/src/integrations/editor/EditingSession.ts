/**
 * EditingSession
 *
 * Manages a collection of ModifiedFileEntries for one agent interaction turn.
 * Collects edits and provides per-file accept/reject.
 *
 * Follows VS Code's ChatEditingSession pattern:
 * - Entries are created on first edit to a file
 * - Edits are always written to disk (backup kept for rollback)
 * - After collection completes, user reviews & accepts/rejects per file
 */

import * as fs from "fs/promises"
import type { Event } from "vscode"
import { EventEmitter } from "vscode"
import { Logger } from "@/shared/services/Logger"
import { generateEntryId, type IModifiedFileEntry, ModifiedFileEntry, ModifiedFileEntryState } from "./ModifiedFileEntry"

export type EditingSessionState = "idle" | "collecting" | "reviewing" | "completed"

export interface IEditingSession {
	readonly sessionId: string
	readonly state: EditingSessionState
	readonly entries: readonly IModifiedFileEntry[]

	startCollecting(): void

	/** Resume collecting after reviewing — pending edits stay in the session */
	resumeCollecting(): void

	/** Queue a text replacement edit — writes to disk + keeps backup */
	queueEdit(filePath: string, relPath: string, oldText: string, newText: string): Promise<void>

	/** Queue a full file write — writes to disk + keeps backup */
	queueWrite(filePath: string, relPath: string, content: string): Promise<void>

	/** Mark collection complete and switch to reviewing */
	finishCollecting(): void

	/** Accept a single recorded edit hunk */
	acceptHunk(hunkId: string): Promise<void>

	/** Reject a single recorded edit hunk */
	rejectHunk(hunkId: string): Promise<void>

	/** Accept changes for specific files (empty = all) */
	accept(...filePaths: string[]): Promise<void>

	/** Reject changes for specific files (empty = all) */
	reject(...filePaths: string[]): Promise<void>

	getEntry(filePath: string): IModifiedFileEntry | undefined

	countByState(): Record<ModifiedFileEntryState, number>

	reset(): Promise<void>

	onDidChangeState: Event<EditingSessionState>
	onDidChangeEntries: Event<void>
}

export class EditingSession implements IEditingSession {
	private readonly _onDidChangeState = new EventEmitter<EditingSessionState>()
	readonly onDidChangeState = this._onDidChangeState.event

	private readonly _onDidChangeEntries = new EventEmitter<void>()
	readonly onDidChangeEntries = this._onDidChangeEntries.event

	private _state: EditingSessionState = "idle"
	private _entries: ModifiedFileEntry[] = []

	constructor(readonly sessionId: string) {}

	get state(): EditingSessionState {
		return this._state
	}

	get entries(): readonly IModifiedFileEntry[] {
		return this._entries
	}

	startCollecting(): void {
		this._setState("collecting")
		Logger.log(`[EditingSession ${this.sessionId}] Started collecting edits`)
	}

	/**
	 * Resume collecting after a reviewing phase. Used when the agent starts a new
	 * turn while the user has not finished reviewing the previous turn's edits —
	 * the pending edits stay in the session (VS Code chat editing semantics)
	 * instead of being silently dropped.
	 */
	resumeCollecting(): void {
		this._assertState("reviewing")
		this._setState("collecting")
		Logger.log(`[EditingSession ${this.sessionId}] Resumed collecting edits`)
	}

	async queueEdit(filePath: string, relPath: string, oldText: string, newText: string): Promise<void> {
		this._assertState("collecting")
		const entry = await this._getOrCreateEntry(filePath, relPath)
		await entry.applyEdit(oldText, newText)
		this._onDidChangeEntries.fire()
	}

	async queueWrite(filePath: string, relPath: string, content: string): Promise<void> {
		this._assertState("collecting")
		const entry = await this._getOrCreateEntry(filePath, relPath)
		await entry.replaceContent(content)
		this._onDidChangeEntries.fire()
	}

	finishCollecting(): void {
		this._assertState("collecting")
		this._setState("reviewing")
		Logger.log(`[EditingSession ${this.sessionId}] Finished collecting, ${this._entries.length} file(s) modified`)
	}

	async acceptHunk(hunkId: string): Promise<void> {
		this._assertState("reviewing")
		const entry = this._entries.find((item) => item.hunks.some((hunk) => hunk.hunkId === hunkId))
		await entry?.acceptHunk(hunkId)
		this._onDidChangeEntries.fire()
		this._checkAllResolved()
	}

	async rejectHunk(hunkId: string): Promise<void> {
		this._assertState("reviewing")
		const entry = this._entries.find((item) => item.hunks.some((hunk) => hunk.hunkId === hunkId))
		await entry?.rejectHunk(hunkId)
		this._onDidChangeEntries.fire()
		this._checkAllResolved()
	}

	async accept(...filePaths: string[]): Promise<void> {
		this._assertState("reviewing")
		const targets = filePaths.length > 0 ? this._entries.filter((e) => filePaths.includes(e.filePath)) : this._entries

		await Promise.all(targets.filter((e) => e.state === ModifiedFileEntryState.Modified).map((e) => e.accept()))

		this._checkAllResolved()
	}

	async reject(...filePaths: string[]): Promise<void> {
		this._assertState("reviewing")
		const targets = filePaths.length > 0 ? this._entries.filter((e) => filePaths.includes(e.filePath)) : this._entries

		await Promise.all(targets.filter((e) => e.state === ModifiedFileEntryState.Modified).map((e) => e.reject()))

		this._checkAllResolved()
	}

	getEntry(filePath: string): IModifiedFileEntry | undefined {
		// Prefer the still-pending entry; resolved entries with the same path are
		// kept only as history of earlier review rounds.
		return (
			this._entries.find((e) => e.filePath === filePath && e.state === ModifiedFileEntryState.Modified) ??
			this._entries.find((e) => e.filePath === filePath)
		)
	}

	countByState(): Record<ModifiedFileEntryState, number> {
		return {
			[ModifiedFileEntryState.Modified]: this._entries.filter((e) => e.state === ModifiedFileEntryState.Modified).length,
			[ModifiedFileEntryState.Accepted]: this._entries.filter((e) => e.state === ModifiedFileEntryState.Accepted).length,
			[ModifiedFileEntryState.Rejected]: this._entries.filter((e) => e.state === ModifiedFileEntryState.Rejected).length,
		}
	}

	async reset(): Promise<void> {
		await Promise.all(this._entries.map((e) => e.dispose()))
		this._entries = []
		this._setState("idle")
	}

	private async _getOrCreateEntry(filePath: string, relPath: string): Promise<ModifiedFileEntry> {
		// Only a still-pending entry can take more edits. An entry that was already
		// accepted/rejected belongs to a finished review round — a new edit to the
		// same file starts a fresh entry with a fresh original snapshot.
		const existing = this._entries.find((e) => e.filePath === filePath && e.state === ModifiedFileEntryState.Modified)
		if (existing) {
			return existing
		}

		let originalContent = ""
		let isNewFile = false
		try {
			originalContent = await fs.readFile(filePath, "utf-8")
		} catch {
			// New file — content is empty
			isNewFile = true
		}

		const entry = new ModifiedFileEntry(generateEntryId(), filePath, relPath, originalContent, isNewFile)
		this._entries.push(entry)
		return entry
	}

	private _checkAllResolved(): void {
		const remaining = this._entries.filter((e) => e.state === ModifiedFileEntryState.Modified)
		if (remaining.length === 0) {
			this._setState("completed")
		}
	}

	private _setState(newState: EditingSessionState): void {
		this._state = newState
		this._onDidChangeState.fire(newState)
	}

	private _assertState(expected: EditingSessionState): void {
		if (this._state !== expected) {
			throw new Error(`EditingSession ${this.sessionId}: expected state "${expected}", got "${this._state}"`)
		}
	}
}
