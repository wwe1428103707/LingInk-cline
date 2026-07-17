import {
	BookOpenTextIcon,
	ClipboardCheckIcon,
	FlaskConicalIcon,
	GitBranchIcon,
	LanguagesIcon,
	LightbulbIcon,
	LinkIcon,
	type LucideIcon,
	MessagesSquareIcon,
	PresentationIcon,
	ScanSearchIcon,
	WorkflowIcon,
} from "lucide-react"
import React from "react"
import { useTranslation } from "@/i18n"
import {
	ACADEMIC_PIPELINE_PROMPT,
	ARTICLE_POLISH_PROMPT,
	CITATION_CHECK_PROMPT,
	EXPERIMENT_ASSISTANT_PROMPT,
	FORMAT_CHECK_PROMPT,
	LITERATURE_REVIEW_PROMPT,
	LOGIC_SCAN_PROMPT,
	OFFICE_ACADEMIC_ASSISTANT_PROMPT,
	PAPER_STRUCTURE_PROMPT,
	PEER_REVIEW_PROMPT,
	RESEARCH_TOPIC_PROMPT,
} from "../../../../src/shared/academicShortcutPrompts"

interface AcademicTask {
	id: string
	icon: LucideIcon
	title: string
	description: string
	slashCommand: string
}

interface AcademicQuickTasksProps {
	onSelectTask: (prompt: string) => void
}

const AcademicQuickTasks: React.FC<AcademicQuickTasksProps> = ({ onSelectTask }) => {
	const { t } = useTranslation()

	const academicTasks: AcademicTask[] = [
		{
			id: "topic-selection",
			icon: LightbulbIcon,
			title: t("welcome.academic.topicSelection.title", "Topic Selection"),
			description: t("welcome.academic.topicSelection.description", "Research topic suggestions and direction analysis"),
			slashCommand: RESEARCH_TOPIC_PROMPT,
		},
		{
			id: "lit-review",
			icon: BookOpenTextIcon,
			title: t("welcome.academic.litReview.title", "Literature Review"),
			description: t("welcome.academic.litReview.description", "Search literature and generate a structured review"),
			slashCommand: LITERATURE_REVIEW_PROMPT,
		},
		{
			id: "academic-pipeline",
			icon: WorkflowIcon,
			title: t("welcome.academic.pipeline.title", "Full Research Pipeline"),
			description: t("welcome.academic.pipeline.description", "Research, writing, review, revision, and finalization"),
			slashCommand: ACADEMIC_PIPELINE_PROMPT,
		},
		{
			id: "experiment-assistant",
			icon: FlaskConicalIcon,
			title: t("welcome.academic.experiment.title", "Experiment Assistant"),
			description: t(
				"welcome.academic.experiment.description",
				"MATLAB/Python simulation, signal processing, statistics, machine learning, and paper figures",
			),
			slashCommand: EXPERIMENT_ASSISTANT_PROMPT,
		},
		{
			id: "office-academic-assistant",
			icon: PresentationIcon,
			title: t("welcome.academic.office.title", "Word/PPT Assistant"),
			description: t(
				"welcome.academic.office.description",
				"Literature reading reports, group meeting slides, and proposal/midterm/defense PPTs",
			),
			slashCommand: OFFICE_ACADEMIC_ASSISTANT_PROMPT,
		},
		{
			id: "paper-structure",
			icon: GitBranchIcon,
			title: t("welcome.academic.paperStructure.title", "Paper Restructuring"),
			description: t("welcome.academic.paperStructure.description", "Optimize paper outline and chapter structure"),
			slashCommand: PAPER_STRUCTURE_PROMPT,
		},
		{
			id: "article-polish",
			icon: LanguagesIcon,
			title: t("welcome.academic.articlePolish.title", "Article Polishing"),
			description: t(
				"welcome.academic.articlePolish.description",
				"Improve Chinese/English academic expression, logical flow, and writing style",
			),
			slashCommand: ARTICLE_POLISH_PROMPT,
		},
		{
			id: "logic-scan",
			icon: ScanSearchIcon,
			title: t("welcome.academic.logicScan.title", "Logic Scan"),
			description: t("welcome.academic.logicScan.description", "Check for logical gaps and flaws in argumentation"),
			slashCommand: LOGIC_SCAN_PROMPT,
		},
		{
			id: "peer-review",
			icon: MessagesSquareIcon,
			title: t("welcome.academic.peerReview.title", "Mock Peer Review"),
			description: t("welcome.academic.peerReview.description", "Review your paper from a reviewer's perspective"),
			slashCommand: PEER_REVIEW_PROMPT,
		},
		{
			id: "citation-check",
			icon: LinkIcon,
			title: t("welcome.academic.citationCheck.title", "Citation Check"),
			description: t("welcome.academic.citationCheck.description", "Check citation format and argument support"),
			slashCommand: CITATION_CHECK_PROMPT,
		},
		{
			id: "format-check",
			icon: ClipboardCheckIcon,
			title: t("welcome.academic.formatCheck.title", "Submission Format Check"),
			description: t("welcome.academic.formatCheck.description", "Check formatting requirements of the target journal"),
			slashCommand: FORMAT_CHECK_PROMPT,
		},
	]

	return (
		<div className="px-4 pt-4 pb-2 select-none">
			<h2 className="text-sm font-medium mb-3 text-center text-foreground/70">
				{t("welcome.academic.heading", "Academic Quick Tasks")}
			</h2>
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
				{academicTasks.map((task) => {
					const Icon = task.icon

					return (
						<button
							className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border-panel bg-foreground/5 hover:bg-list-hover hover:border-(--vscode-focusBorder) focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all duration-150 ease-in-out cursor-pointer text-left group"
							key={task.id}
							onClick={() => onSelectTask(task.slashCommand)}
							type="button">
							<Icon
								aria-hidden="true"
								className="size-6 text-(--vscode-icon-foreground) transition-colors duration-150 group-hover:text-(--vscode-textLink-foreground)"
								strokeWidth={1.8}
							/>
							<span className="text-xs font-medium text-(--vscode-editor-foreground) text-center leading-tight">
								{task.title}
							</span>
							<span className="text-[10px] text-description text-center leading-tight line-clamp-2">
								{task.description}
							</span>
						</button>
					)
				})}
			</div>
		</div>
	)
}

export default AcademicQuickTasks
