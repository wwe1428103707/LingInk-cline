/**
 * ReviewDecorationController
 *
 * In-editor affordances for pending LingInk edits — the closest public-API
 * approximation of VS Code's internal chat editing overlay:
 * - line decorations on still-pending hunks (background + overview ruler),
 * - CodeLenses above each pending hunk (keep/undo this hunk) and at the top
 *   of the file (open diff / keep / undo the whole file).
 *
 * The real inline rendering of deleted lines and floating hunk toolbars uses
 * internal workbench APIs (IViewZone/IOverlayWidget) that third-party
 * extensions cannot access.
 */

import * as vscode from "vscode"
import type { EditingSessionService } from "@/integrations/editor/editingSessionService"
import { type IModifiedFileEntry, ModifiedFileHunkState } from "@/integrations/editor/ModifiedFileEntry"
import { ExtensionRegistryInfo } from "@/registry"

export class ReviewDecorationController implements vscode.Disposable {
	private readonly _disposables: vscode.Disposable[] = []
	private readonly _codeLensProvider: ReviewCodeLensProvider
	private readonly _pendingDecoration: vscode.TextEditorDecorationType | undefined

	constructor(private readonly _service: EditingSessionService) {
		// In non-VS Code hosts the window/languages namespaces may be partial —
		// every registration is guarded like EditReviewWebviewPanel does.
		this._codeLensProvider = new ReviewCodeLensProvider(_service)
		this._pendingDecoration =
			typeof vscode.window.createTextEditorDecorationType === "function"
				? vscode.window.createTextEditorDecorationType({
						isWholeLine: true,
						backgroundColor: new vscode.ThemeColor("diffEditor.insertedLineBackground"),
						overviewRulerColor: new vscode.ThemeColor("editorOverviewRuler.addedForeground"),
						overviewRulerLane: vscode.OverviewRulerLane.Right,
					})
				: undefined
		if (typeof vscode.languages.registerCodeLensProvider === "function") {
			this._disposables.push(vscode.languages.registerCodeLensProvider({ scheme: "file" }, this._codeLensProvider))
		}
		if (typeof vscode.window.onDidChangeVisibleTextEditors === "function") {
			this._disposables.push(
				vscode.window.onDidChangeVisibleTextEditors((editors) => this._updateAll(editors)),
				vscode.workspace.onDidChangeTextDocument((event) => {
					for (const editor of vscode.window.visibleTextEditors) {
						if (editor.document === event.document) {
							this._update(editor)
						}
					}
				}),
				this._service.onDidChangeReviewState(() => this.refresh()),
			)
		}
		this._updateAll(vscode.window.visibleTextEditors ?? [])
	}

	refresh(): void {
		this._codeLensProvider.refresh()
		this._updateAll(vscode.window.visibleTextEditors ?? [])
	}

	private _updateAll(editors: readonly vscode.TextEditor[]): void {
		for (const editor of editors) {
			this._update(editor)
		}
	}

	private _update(editor: vscode.TextEditor): void {
		if (!this._pendingDecoration) {
			return
		}
		const entry =
			editor.document.uri.scheme === "file" ? this._service.getPendingEntryForFile(editor.document.uri.fsPath) : undefined
		const ranges = entry ? this._hunkRanges(editor.document, entry) : []
		editor.setDecorations(this._pendingDecoration, ranges)
	}

	private _hunkRanges(document: vscode.TextDocument, entry: IModifiedFileEntry): vscode.Range[] {
		// Hunk offsets are only valid while the live document matches the recorded
		// modified content (the user may have typed into the file) — skip otherwise.
		if (document.getText() !== entry.modifiedContent) {
			return []
		}
		const ranges: vscode.Range[] = []
		for (const hunk of entry.hunks) {
			if (hunk.state !== ModifiedFileHunkState.Modified) {
				continue
			}
			const start = document.positionAt(hunk.startOffset)
			const end = document.positionAt(hunk.startOffset + Math.max(hunk.newText.length, 1))
			ranges.push(new vscode.Range(start, end))
		}
		// Whole-file writes carry no hunks — mark the file start so the pending
		// state is still visible in the editor.
		if (ranges.length === 0) {
			ranges.push(new vscode.Range(0, 0, 0, 0))
		}
		return ranges
	}

	dispose(): void {
		if (this._pendingDecoration) {
			for (const editor of vscode.window.visibleTextEditors ?? []) {
				editor.setDecorations(this._pendingDecoration, [])
			}
			this._pendingDecoration.dispose()
		}
		for (const disposable of this._disposables) {
			disposable.dispose()
		}
	}
}

class ReviewCodeLensProvider implements vscode.CodeLensProvider {
	private readonly _onDidChangeCodeLenses = new vscode.EventEmitter<void>()
	readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event

	constructor(private readonly _service: EditingSessionService) {}

	refresh(): void {
		this._onDidChangeCodeLenses.fire()
	}

	provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
		if (document.uri.scheme !== "file") {
			return []
		}
		const entry = this._service.getPendingEntryForFile(document.uri.fsPath)
		if (!entry) {
			return []
		}
		const commands = ExtensionRegistryInfo.commands
		const lenses: vscode.CodeLens[] = [
			new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), {
				title: "$(diff) 查看差异",
				command: commands.OpenReviewDiff,
				arguments: [entry.filePath],
			}),
			new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), {
				title: "$(check) 保留文件",
				command: commands.AcceptReviewedFile,
				arguments: [entry.filePath],
			}),
			new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), {
				title: "$(discard) 撤销文件",
				command: commands.RejectReviewedFile,
				arguments: [entry.filePath],
			}),
		]
		// Per-hunk lenses are only valid while the document matches the recorded
		// modified content (same guard as the decorations).
		if (document.getText() === entry.modifiedContent) {
			for (const hunk of entry.hunks) {
				if (hunk.state !== ModifiedFileHunkState.Modified) {
					continue
				}
				const position = document.positionAt(hunk.startOffset)
				const range = new vscode.Range(position, position)
				lenses.push(
					new vscode.CodeLens(range, {
						title: "保留此段",
						command: commands.AcceptReviewedHunk,
						arguments: [hunk.hunkId],
					}),
					new vscode.CodeLens(range, {
						title: "撤销此段",
						command: commands.RejectReviewedHunk,
						arguments: [hunk.hunkId],
					}),
				)
			}
		}
		return lenses
	}
}
