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
		prompt: "Help me plan an academic paper. Ask for my topic, field, target venue or course requirements, then draft a clear research question, thesis statement, section outline, and writing plan.",
		buttonText: ">",
	},
	{
		id: "literature_review",
		title: "Review Literature",
		description: "Organize sources into themes, gaps, and evidence",
		icon: "LiteratureIcon",
		actionCommand: "lingink/createLiteratureReview",
		prompt: "Help me write a literature review. Ask me for my topic and sources, then organize the literature into themes, key debates, evidence, research gaps, and a concise synthesis structure.",
		buttonText: ">",
	},
	{
		id: "polish_abstract",
		title: "Polish an Abstract",
		description: "Refine academic tone, clarity, and contribution",
		icon: "PolishIcon",
		actionCommand: "lingink/polishAbstract",
		prompt: "Help me polish an academic abstract. Ask me to paste the abstract, then improve clarity, academic tone, logical flow, contribution statement, and keyword fit while preserving the original meaning.",
		buttonText: ">",
	},
	{
		id: "reviewer_response",
		title: "Draft Reviewer Response",
		description: "Prepare point-by-point replies to reviewer comments",
		icon: "ReviewIcon",
		actionCommand: "lingink/createReviewerResponse",
		prompt: "Help me draft a response to reviewers. Ask for the reviewer comments and manuscript context, then create polite point-by-point replies with revision notes and suggested manuscript changes.",
		buttonText: ">",
	},
]
