/**
 * Verification tests for the edit review flow core components.
 *
 * Tests core logic of ModifiedFileEntry and EditingSession
 * without requiring VS Code API or filesystem access.
 */

import * as path from "path"
import * as fs from "fs/promises"
import * as os from "os"
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { ModifiedFileEntry, ModifiedFileEntryState, generateEntryId } from "../ModifiedFileEntry"
import { EditingSession } from "../EditingSession"

describe("ModifiedFileEntry", () => {
	let testDir: string
	let entry: ModifiedFileEntry

	beforeEach(async () => {
		testDir = await fs.mkdtemp(path.join(os.tmpdir(), "lingink-edit-test-"))
		entry = new ModifiedFileEntry(
			generateEntryId(),
			path.join(testDir, "test.ts"),
			"test.ts",
			"line1\nline2\nline3\n",
		)
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

	beforeEach(() => {
		session = new EditingSession("test-session-1")
	})

	afterEach(async () => {
		await session.reset()
	})

	it("starts in idle state", () => {
		expect(session.state).toBe("idle")
	})

	it("transitions to collecting on startCollecting()", () => {
		session.startCollecting()
		expect(session.state).toBe("collecting")
	})

	it("creates entry on first queueEdit", async () => {
		session.startCollecting()
		await session.queueEdit("/tmp/test.ts", "test.ts", "old", "new")
		expect(session.entries).toHaveLength(1)
		expect(session.entries[0].relPath).toBe("test.ts")
	})

	it("reuses entry on subsequent queueEdit for same file", async () => {
		session.startCollecting()
		await session.queueEdit("/tmp/test.ts", "test.ts", "old", "new")
		await session.queueEdit("/tmp/test.ts", "test.ts", "foo", "bar")
		expect(session.entries).toHaveLength(1)
	})

	it("creates multiple entries for different files", async () => {
		session.startCollecting()
		await session.queueEdit("/tmp/a.ts", "a.ts", "old", "new")
		await session.queueEdit("/tmp/b.ts", "b.ts", "old", "new")
		expect(session.entries).toHaveLength(2)
	})

	it("transitions to reviewing on finishCollecting()", async () => {
		session.startCollecting()
		await session.queueEdit("/tmp/test.ts", "test.ts", "old", "new")
		session.finishCollecting()
		expect(session.state).toBe("reviewing")
	})

	it("countByState returns correct counts", async () => {
		session.startCollecting()
		await session.queueEdit("/tmp/a.ts", "a.ts", "old", "new")
		await session.queueEdit("/tmp/b.ts", "b.ts", "old", "new")
		session.finishCollecting()
		expect(session.countByState().modified).toBe(2)
	})

	it("getEntry returns entry by file path", async () => {
		session.startCollecting()
		await session.queueEdit("/tmp/test.ts", "test.ts", "old", "new")
		const entry = session.getEntry("/tmp/test.ts")
		expect(entry).toBeDefined()
		expect(entry!.relPath).toBe("test.ts")
	})

	it("transitions to completed when all entries resolved", async () => {
		session.startCollecting()
		await session.queueEdit("/tmp/a.ts", "a.ts", "old", "new")
		session.finishCollecting()
		await session.accept()
		expect(session.state).toBe("completed")
	})

	it("throws if queueEdit called without collecting", async () => {
		await expect(session.queueEdit("/tmp/test.ts", "test.ts", "old", "new")).rejects.toThrow()
	})

	it("throws if accept called without reviewing", async () => {
		await expect(session.accept()).rejects.toThrow()
	})

	it("empty entries transitions to completed after accept all", async () => {
		session.startCollecting()
		await session.queueEdit("/tmp/a.ts", "a.ts", "old", "new")
		await session.queueEdit("/tmp/b.ts", "b.ts", "old", "new")
		session.finishCollecting()
		await session.accept()
		expect(session.state).toBe("completed")
	})

	it("reset clears entries and returns to idle", async () => {
		session.startCollecting()
		await session.queueEdit("/tmp/test.ts", "test.ts", "old", "new")
		await session.reset()
		expect(session.state).toBe("idle")
		expect(session.entries).toHaveLength(0)
	})
})
