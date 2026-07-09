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
	{
		id: "experiment_assistant",
		title: "实验助手",
		description: "MATLAB/Python 仿真、信号处理、统计、机器学习与论文配图",
		icon: "ExperimentIcon",
		actionCommand: "lingink/startExperimentAssistant",
		prompt: "/scientific-toolkit-skill 请作为实验助手协助我完成科研计算任务。优先询问任务目标、数据或代码位置、物理量/单位、输入输出格式、期望图表和验证方式；可覆盖 MATLAB/Python 仿真、信号处理、统计分析、机器学习、优化、论文配图与可复现实验流程。不要编造实验参数或结果，必要时先列出假设和需要我补充的信息。",
		buttonText: ">",
	},
	{
		id: "office_academic_assistant",
		title: "Word/PPT 助手",
		description: "文献阅读报告、组会 PPT、开题/中期/答辩 PPT",
		icon: "PresentationIcon",
		actionCommand: "lingink/startOfficeAcademicAssistant",
		prompt: "/office-academic-skill 请作为 Word/PPT 助手协助我制作或修改学术交付物。优先询问用途、受众、时长/页数、模板要求、源文件和输出格式；可覆盖文献阅读报告、组会 PPT、课程汇报、开题/中期/答辩 PPT、DOCX/PPTX 生成与质量检查。默认中文表达，保留英文题名、公式、变量名和参考文献信息，并为关键结论标注来源。",
		buttonText: ">",
	},
]
