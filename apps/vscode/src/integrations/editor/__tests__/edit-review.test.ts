/**
 * Verification tests for the edit review flow core components.
 *
 * Tests core logic of ModifiedFileEntry and EditingSession
 * without requiring VS Code API or filesystem access.
 */

import * as fs from "fs/promises"
import * as os from "os"
import * as path from "path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { EditingSession } from "../EditingSession"
import { generateEntryId, ModifiedFileEntry, ModifiedFileEntryState } from "../ModifiedFileEntry"

const assertDefined = <T>(value: T | undefined): T => {
	expect(value).toBeDefined()
	if (value === undefined) {
		throw new Error("Expected value to be defined")
	}
	return value
}

describe("ModifiedFileEntry", () => {
	let testDir: string
	let entry: ModifiedFileEntry

	beforeEach(async () => {
		testDir = await fs.mkdtemp(path.join(os.tmpdir(), "lingink-edit-test-"))
		entry = new ModifiedFileEntry(generateEntryId(), path.join(testDir, "test.ts"), "test.ts", "line1\nline2\nline3\n")
	})

	afterEach(async () => {
		await entry.dispose()
		await fs.rm(testDir, { recursive: true, force: true })
	})

	it("starts in Modified state", () => {
		expect(entry.state).toBe(ModifiedFileEntryState.Modified)
	})

	it("stores original content", () => {
		expect(entry.originalContent).toBe("line1\nline2\nline3\n")
	})

	it("applies text replacement edit", async () => {
		await entry.applyEdit("line2", "line2_modified")
		expect(entry.modifiedContent).toBe("line1\nline2_modified\nline3\n")
	})

	it("records a hunk for text replacement edit", async () => {
		await entry.applyEdit("line2", "line2_modified")
		expect(entry.hunks).toHaveLength(1)
		expect(entry.hunks[0]?.oldText).toBe("line2")
		expect(entry.hunks[0]?.newText).toBe("line2_modified")
		expect(entry.hunks[0]?.state).toBe("modified")
	})

	it("accepts a single hunk and resolves the entry", async () => {
		await entry.applyEdit("line2", "line2_modified")
		const hunk = assertDefined(entry.hunks[0])
		await entry.acceptHunk(hunk.hunkId)
		expect(entry.hunks[0]?.state).toBe("accepted")
		expect(entry.state).toBe(ModifiedFileEntryState.Accepted)
		const content = await fs.readFile(path.join(testDir, "test.ts"), "utf-8")
		expect(content).toBe("line1\nline2_modified\nline3\n")
	})

	it("rejects a single hunk without reverting other edits", async () => {
		await entry.applyEdit("line1", "line1_modified")
		await entry.applyEdit("line2", "line2_modified")
		const firstHunk = assertDefined(entry.hunks[0])
		const secondHunk = assertDefined(entry.hunks[1])

		await entry.rejectHunk(secondHunk.hunkId)
		expect(entry.modifiedContent).toBe("line1_modified\nline2\nline3\n")
		expect(entry.hunks[1]?.state).toBe("rejected")
		expect(entry.state).toBe(ModifiedFileEntryState.Modified)

		await entry.acceptHunk(firstHunk.hunkId)
		expect(entry.state).toBe(ModifiedFileEntryState.Accepted)
		const content = await fs.readFile(path.join(testDir, "test.ts"), "utf-8")
		expect(content).toBe("line1_modified\nline2\nline3\n")
	})

	it("rejects the selected hunk when replacement text appears more than once", async () => {
		const duplicateEntry = new ModifiedFileEntry(
			generateEntryId(),
			path.join(testDir, "duplicate.txt"),
			"duplicate.txt",
			"important result and important method",
		)
		try {
			await duplicateEntry.applyEdit("important result", "significant result")
			await duplicateEntry.applyEdit("important method", "significant method")
			const secondHunk = assertDefined(duplicateEntry.hunks[1])

			await duplicateEntry.rejectHunk(secondHunk.hunkId)

			expect(duplicateEntry.modifiedContent).toBe("significant result and important method")
		} finally {
			await duplicateEntry.dispose()
		}
	})

	it("replaces entire content", async () => {
		await entry.replaceContent("completely new content")
		expect(entry.modifiedContent).toBe("completely new content")
	})

	it("transitions to Accepted on accept", async () => {
		await entry.accept()
		expect(entry.state).toBe(ModifiedFileEntryState.Accepted)
	})

	it("transitions to Rejected on reject", async () => {
		await entry.reject()
		expect(entry.state).toBe(ModifiedFileEntryState.Rejected)
	})

	it("ignores edits after accept", async () => {
		await entry.accept()
		await entry.applyEdit("line2", "should_not_apply")
		expect(entry.modifiedContent).toBe("line1\nline2\nline3\n")
	})

	it("ignores edits after reject", async () => {
		await entry.reject()
		await entry.applyEdit("line2", "should_not_apply")
		expect(entry.modifiedContent).toBe("line1\nline2\nline3\n")
	})

	it("accept writes to disk and restores on reject", async () => {
		await entry.applyEdit("line2", "modified")
		await entry.accept()
		expect(entry.state).toBe(ModifiedFileEntryState.Accepted)
		const content = await fs.readFile(path.join(testDir, "test.ts"), "utf-8")
		expect(content).toBe("line1\nmodified\nline3\n")
	})

	it("reject restores original file content", async () => {
		await entry.applyEdit("line2", "modified")
		await entry.reject()
		expect(entry.state).toBe(ModifiedFileEntryState.Rejected)
		const content = await fs.readFile(path.join(testDir, "test.ts"), "utf-8")
		expect(content).toBe("line1\nline2\nline3\n")
	})
})

describe("EditingSession", () => {
	let session: EditingSession
	let testDir: string

	beforeEach(async () => {
		testDir = await fs.mkdtemp(path.join(os.tmpdir(), "lingink-session-test-"))
		session = new EditingSession("test-session-1")
	})

	afterEach(async () => {
		await session.reset()
		await fs.rm(testDir, { recursive: true, force: true })
	})

	const createFile = async (name: string, content = "old\nfoo\nbar\n") => {
		const filePath = path.join(testDir, name)
		await fs.writeFile(filePath, content, "utf-8")
		return filePath
	}

	it("starts in idle state", () => {
		expect(session.state).toBe("idle")
	})

	it("transitions to collecting on startCollecting()", () => {
		session.startCollecting()
		expect(session.state).toBe("collecting")
	})

	it("creates entry on first queueEdit", async () => {
		const filePath = await createFile("test.ts")
		session.startCollecting()
		await session.queueEdit(filePath, "test.ts", "old", "new")
		expect(session.entries).toHaveLength(1)
		expect(session.entries[0].relPath).toBe("test.ts")
	})

	it("reuses entry on subsequent queueEdit for same file", async () => {
		const filePath = await createFile("test.ts", "old\nfoo\n")
		session.startCollecting()
		await session.queueEdit(filePath, "test.ts", "old", "new")
		await session.queueEdit(filePath, "test.ts", "foo", "bar")
		expect(session.entries).toHaveLength(1)
	})

	it("creates multiple entries for different files", async () => {
		const aPath = await createFile("a.ts")
		const bPath = await createFile("b.ts")
		session.startCollecting()
		await session.queueEdit(aPath, "a.ts", "old", "new")
		await session.queueEdit(bPath, "b.ts", "old", "new")
		expect(session.entries).toHaveLength(2)
	})

	it("transitions to reviewing on finishCollecting()", async () => {
		const filePath = await createFile("test.ts")
		session.startCollecting()
		await session.queueEdit(filePath, "test.ts", "old", "new")
		session.finishCollecting()
		expect(session.state).toBe("reviewing")
	})

	it("countByState returns correct counts", async () => {
		const aPath = await createFile("a.ts")
		const bPath = await createFile("b.ts")
		session.startCollecting()
		await session.queueEdit(aPath, "a.ts", "old", "new")
		await session.queueEdit(bPath, "b.ts", "old", "new")
		session.finishCollecting()
		expect(session.countByState().modified).toBe(2)
	})

	it("getEntry returns entry by file path", async () => {
		const filePath = await createFile("test.ts")
		session.startCollecting()
		await session.queueEdit(filePath, "test.ts", "old", "new")
		const entry = session.getEntry(filePath)
		expect(assertDefined(entry).relPath).toBe("test.ts")
	})

	it("transitions to completed when all entries resolved", async () => {
		const filePath = await createFile("a.ts")
		session.startCollecting()
		await session.queueEdit(filePath, "a.ts", "old", "new")
		session.finishCollecting()
		await session.accept()
		expect(session.state).toBe("completed")
	})

	it("accepts one hunk and completes when no pending hunks remain", async () => {
		const filePath = await createFile("a.ts")
		session.startCollecting()
		await session.queueEdit(filePath, "a.ts", "old", "new")
		session.finishCollecting()
		const hunk = assertDefined(session.entries[0]?.hunks[0])
		await session.acceptHunk(hunk.hunkId)
		expect(session.state).toBe("completed")
	})

	it("rejects one hunk and keeps accepted edits in the file", async () => {
		const filePath = await createFile("a.ts", "old\nfoo\n")
		session.startCollecting()
		await session.queueEdit(filePath, "a.ts", "old", "new")
		await session.queueEdit(filePath, "a.ts", "foo", "bar")
		session.finishCollecting()
		const firstHunk = assertDefined(session.entries[0]?.hunks[0])
		const secondHunk = assertDefined(session.entries[0]?.hunks[1])

		await session.acceptHunk(firstHunk.hunkId)
		await session.rejectHunk(secondHunk.hunkId)

		expect(session.state).toBe("completed")
		await expect(fs.readFile(filePath, "utf-8")).resolves.toBe("new\nfoo\n")
	})

	it("throws if queueEdit called without collecting", async () => {
		const filePath = await createFile("test.ts")
		await expect(session.queueEdit(filePath, "test.ts", "old", "new")).rejects.toThrow()
	})

	it("throws if accept called without reviewing", async () => {
		await expect(session.accept()).rejects.toThrow()
	})

	it("empty entries transitions to completed after accept all", async () => {
		const aPath = await createFile("a.ts")
		const bPath = await createFile("b.ts")
		session.startCollecting()
		await session.queueEdit(aPath, "a.ts", "old", "new")
		await session.queueEdit(bPath, "b.ts", "old", "new")
		session.finishCollecting()
		await session.accept()
		expect(session.state).toBe("completed")
	})

	it("reset clears entries and returns to idle", async () => {
		const filePath = await createFile("test.ts")
		session.startCollecting()
		await session.queueEdit(filePath, "test.ts", "old", "new")
		await session.reset()
		expect(session.state).toBe("idle")
		expect(session.entries).toHaveLength(0)
	})
})
