/**
 * editReviewPersistence
 *
 * Persistence for pending edit reviews, following VS Code's
 * chatEditingSessionStorage pattern: the pending state (original + modified
 * snapshots per file) is written under the Cline data directory so the review
 * survives window reloads and crashes. Backups in `edit-backups/` remain a
 * separate crash-recovery aid; this state file is the authoritative restore
 * source.
 *
 * Layout: <clineDir>/data/edit-review/<sha256(cwd)[:16]>.json
 */

import { createHash } from "node:crypto"
import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"

export interface EditReviewHunkSnapshot {
	oldText: string
	newText: string
	startOffset: number
}

export interface EditReviewEntrySnapshot {
	filePath: string
	relPath: string
	originalContent: string
	modifiedContent: string
	isNewFile: boolean
	hunks: EditReviewHunkSnapshot[]
}

export interface PersistedEditReviewState {
	version: 1
	cwd: string
	sessionId: string
	savedAt: number
	entries: EditReviewEntrySnapshot[]
}

function editReviewStateDir(): string {
	const clineDir = process.env.CLINE_DIR || path.join(os.homedir(), ".cline")
	return path.join(clineDir, "data", "edit-review")
}

export function editReviewStatePath(cwd: string): string {
	const hash = createHash("sha256").update(cwd).digest("hex").slice(0, 16)
	return path.join(editReviewStateDir(), `${hash}.json`)
}

export async function saveEditReviewState(state: PersistedEditReviewState): Promise<void> {
	const statePath = editReviewStatePath(state.cwd)
	await fs.mkdir(path.dirname(statePath), { recursive: true })
	await fs.writeFile(statePath, JSON.stringify(state, null, 2), "utf-8")
}

/**
 * Load the persisted state for a workspace, or undefined when none exists or
 * the file is unreadable/invalid. Invalid state files are removed.
 */
export async function loadEditReviewState(cwd: string): Promise<PersistedEditReviewState | undefined> {
	const statePath = editReviewStatePath(cwd)
	let raw: string
	try {
		raw = await fs.readFile(statePath, "utf-8")
	} catch {
		return undefined
	}
	try {
		const state = JSON.parse(raw) as PersistedEditReviewState
		if (state.version !== 1 || !Array.isArray(state.entries)) {
			throw new Error("unsupported edit review state format")
		}
		return state
	} catch {
		await fs.rm(statePath, { force: true }).catch(() => {})
		return undefined
	}
}

export async function clearEditReviewState(cwd: string): Promise<void> {
	await fs.rm(editReviewStatePath(cwd), { force: true }).catch(() => {})
}
