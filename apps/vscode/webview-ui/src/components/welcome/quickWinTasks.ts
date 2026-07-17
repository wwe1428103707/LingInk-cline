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

type TranslateFn = (key: string, defaultValue: string) => string

export const getQuickWinTasks = (t: TranslateFn): QuickWinTask[] => [
	{
		id: "paper_outline",
		title: t("welcome.quickWin.paperOutline.title", "Plan a Paper"),
		description: t("welcome.quickWin.paperOutline.desc", "Turn a topic into a thesis, outline, and section plan"),
		icon: "OutlineIcon",
		actionCommand: "lingink/createPaperOutline",
		prompt: PAPER_PLAN_PROMPT,
		buttonText: ">",
	},
	{
		id: "literature_review",
		title: t("welcome.quickWin.litReview.title", "Review Literature"),
		description: t("welcome.quickWin.litReview.desc", "Organize sources into themes, gaps, and evidence"),
		icon: "LiteratureIcon",
		actionCommand: "lingink/createLiteratureReview",
		prompt: LITERATURE_REVIEW_PROMPT,
		buttonText: ">",
	},
	{
		id: "polish_abstract",
		title: t("welcome.quickWin.polishAbstract.title", "Polish an Abstract"),
		description: t("welcome.quickWin.polishAbstract.desc", "Refine academic tone, clarity, and contribution"),
		icon: "PolishIcon",
		actionCommand: "lingink/polishAbstract",
		prompt: ABSTRACT_POLISH_PROMPT,
		buttonText: ">",
	},
	{
		id: "reviewer_response",
		title: t("welcome.quickWin.reviewerResponse.title", "Draft Reviewer Response"),
		description: t("welcome.quickWin.reviewerResponse.desc", "Prepare point-by-point replies to reviewer comments"),
		icon: "ReviewIcon",
		actionCommand: "lingink/createReviewerResponse",
		prompt: REVIEWER_RESPONSE_PROMPT,
		buttonText: ">",
	},
	{
		id: "experiment_assistant",
		title: t("welcome.quickWin.experiment.title", "Experiment Assistant"),
		description: t(
			"welcome.quickWin.experiment.desc",
			"MATLAB/Python simulation, signal processing, statistics, machine learning, and paper figures",
		),
		icon: "ExperimentIcon",
		actionCommand: "lingink/startExperimentAssistant",
		prompt: EXPERIMENT_ASSISTANT_PROMPT,
		buttonText: ">",
	},
	{
		id: "office_academic_assistant",
		title: t("welcome.quickWin.office.title", "Word/PPT Assistant"),
		description: t(
			"welcome.quickWin.office.desc",
			"Literature reading reports, group meeting slides, and proposal/midterm/defense PPTs",
		),
		icon: "PresentationIcon",
		actionCommand: "lingink/startOfficeAcademicAssistant",
		prompt: OFFICE_ACADEMIC_ASSISTANT_PROMPT,
		buttonText: ">",
	},
]
