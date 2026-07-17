import type { EditReviewFile } from "@shared/ExtensionMessage"
import type { EditReviewAction } from "@shared/WebviewMessage"
import { Check, ChevronDown, ChevronRight, FileText, LoaderCircleIcon, SquareArrowOutUpRight, X } from "lucide-react"
import { memo, useState } from "react"
import { PLATFORM_CONFIG } from "@/config/platform.config"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { t } from "@/i18n"

function postEditReviewAction(editReviewAction: EditReviewAction) {
	PLATFORM_CONFIG.postMessage({ type: "editReviewAction", editReviewAction })
}

const iconButtonClass =
	"flex size-5 shrink-0 items-center justify-center rounded-[3px] text-description hover:bg-toolbar-hover-background hover:text-foreground cursor-pointer"

const headerButtonClass =
	"shrink-0 rounded-[3px] border border-editor-group-border px-1.5 py-[1px] text-[11px] leading-4 text-description hover:bg-toolbar-hover-background hover:text-foreground cursor-pointer"

const DiffStats = memo<{ insertions: number; deletions: number }>(({ insertions, deletions }) => (
	<span className="flex shrink-0 text-xs text-description">
		{insertions > 0 && <span className="text-success">+{insertions}</span>}
		{insertions > 0 && deletions > 0 && <span className="mx-1">·</span>}
		{deletions > 0 && <span className="text-error">-{deletions}</span>}
	</span>
))

const FileRow = memo<{ file: EditReviewFile }>(({ file }) => (
	<div className="flex h-7 items-center gap-2 text-xs">
		<FileText className="size-3.5 shrink-0 text-description" />
		<span className="min-w-0 flex-1 truncate text-foreground" title={file.relPath}>
			{file.relPath}
		</span>
		<DiffStats deletions={file.deletions} insertions={file.insertions} />
		<button
			aria-label={t("editReview.file.diff", "Diff")}
			className={iconButtonClass}
			onClick={() => postEditReviewAction({ action: "openDiff", filePath: file.filePath })}
			title={t("editReview.file.diff", "Diff")}
			type="button">
			<SquareArrowOutUpRight className="size-3" />
		</button>
		<button
			aria-label={t("editReview.file.accept", "Keep")}
			className={iconButtonClass}
			onClick={() => postEditReviewAction({ action: "accept", filePath: file.filePath })}
			title={t("editReview.file.accept", "Keep")}
			type="button">
			<Check className="size-3.5" />
		</button>
		<button
			aria-label={t("editReview.file.reject", "Undo")}
			className={iconButtonClass}
			onClick={() => postEditReviewAction({ action: "reject", filePath: file.filePath })}
			title={t("editReview.file.reject", "Undo")}
			type="button">
			<X className="size-3.5" />
		</button>
	</div>
))

/**
 * Working-set style bar pinned above the chat input listing the files the agent
 * edited but the user has not reviewed yet. Self-contained: reads `editReview`
 * from the extension state and posts file-level actions back to the host, which
 * re-pushes state so the card updates reactively.
 */
const EditReviewCard = memo(() => {
	const { editReview } = useExtensionState()
	const [isExpanded, setIsExpanded] = useState(true)

	if (!editReview || editReview.files.length === 0) {
		return null
	}

	const totalInsertions = editReview.files.reduce((sum, file) => sum + file.insertions, 0)
	const totalDeletions = editReview.files.reduce((sum, file) => sum + file.deletions, 0)

	return (
		<div className="mx-3 mt-2.5 mb-2.5 rounded-xs border border-editor-group-border bg-code/70 shadow-xs">
			<div className="flex items-center gap-1.5 px-2 py-1.5">
				<button
					aria-label={isExpanded ? t("editReview.collapse", "Collapse") : t("editReview.expand", "Expand")}
					className={iconButtonClass}
					onClick={() => setIsExpanded((prev) => !prev)}
					type="button">
					{isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
				</button>
				<span className="shrink-0 text-xs font-medium text-foreground">{t("editReview.title", "Pending changes")}</span>
				{editReview.state === "collecting" && (
					<span className="flex min-w-0 items-center gap-1 truncate text-xs text-description">
						<LoaderCircleIcon className="size-2.5 shrink-0 animate-spin" />
						{t("editReview.collecting", "Collecting changes…")}
					</span>
				)}
				<span className="flex-1" />
				<DiffStats deletions={totalDeletions} insertions={totalInsertions} />
				<button className={headerButtonClass} onClick={() => postEditReviewAction({ action: "acceptAll" })} type="button">
					{t("editReview.acceptAll", "Keep all")}
				</button>
				<button className={headerButtonClass} onClick={() => postEditReviewAction({ action: "rejectAll" })} type="button">
					{t("editReview.rejectAll", "Undo all")}
				</button>
			</div>
			{isExpanded && (
				<div className="flex flex-col border-t border-editor-group-border px-2.5 py-1">
					{editReview.files.map((file) => (
						<FileRow file={file} key={file.entryId} />
					))}
				</div>
			)}
		</div>
	)
})

export default EditReviewCard
