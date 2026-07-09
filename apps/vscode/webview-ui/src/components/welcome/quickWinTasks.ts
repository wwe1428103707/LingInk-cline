import {
	ABSTRACT_POLISH_PROMPT,
	EXPERIMENT_ASSISTANT_PROMPT,
	LITERATURE_REVIEW_PROMPT,
	OFFICE_ACADEMIC_ASSISTANT_PROMPT,
	PAPER_PLAN_PROMPT,
	REVIEWER_RESPONSE_PROMPT,
} from "../../../../src/shared/academicShortcutPrompts"

export interface QuickWinTask {
	id: string
	title: string
	description: string
	icon?: string
	actionCommand: string
	prompt: string
	buttonText?: string
}

export const quickWinTasks: QuickWinTask[] = [
	{
		id: "paper_outline",
		title: "Plan a Paper",
		description: "Turn a topic into a thesis, outline, and section plan",
		icon: "OutlineIcon",
		actionCommand: "lingink/createPaperOutline",
		prompt: PAPER_PLAN_PROMPT,
		buttonText: ">",
	},
	{
		id: "literature_review",
		title: "Review Literature",
		description: "Organize sources into themes, gaps, and evidence",
		icon: "LiteratureIcon",
		actionCommand: "lingink/createLiteratureReview",
		prompt: LITERATURE_REVIEW_PROMPT,
		buttonText: ">",
	},
	{
		id: "polish_abstract",
		title: "Polish an Abstract",
		description: "Refine academic tone, clarity, and contribution",
		icon: "PolishIcon",
		actionCommand: "lingink/polishAbstract",
		prompt: ABSTRACT_POLISH_PROMPT,
		buttonText: ">",
	},
	{
		id: "reviewer_response",
		title: "Draft Reviewer Response",
		description: "Prepare point-by-point replies to reviewer comments",
		icon: "ReviewIcon",
		actionCommand: "lingink/createReviewerResponse",
		prompt: REVIEWER_RESPONSE_PROMPT,
		buttonText: ">",
	},
	{
		id: "experiment_assistant",
		title: "实验助手",
		description: "MATLAB/Python 仿真、信号处理、统计、机器学习与论文配图",
		icon: "ExperimentIcon",
		actionCommand: "lingink/startExperimentAssistant",
		prompt: EXPERIMENT_ASSISTANT_PROMPT,
		buttonText: ">",
	},
	{
		id: "office_academic_assistant",
		title: "Word/PPT 助手",
		description: "文献阅读报告、组会 PPT、开题/中期/答辩 PPT",
		icon: "PresentationIcon",
		actionCommand: "lingink/startOfficeAcademicAssistant",
		prompt: OFFICE_ACADEMIC_ASSISTANT_PROMPT,
		buttonText: ">",
	},
]
