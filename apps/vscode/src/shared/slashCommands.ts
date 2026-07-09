export interface SlashCommand {
	name: string
	description?: string
	section?: "default" | "custom" | "mcp"
	cliCompatible?: boolean
}

export const BASE_SLASH_COMMANDS: SlashCommand[] = [
	{
		name: "newtask",
		description: "Create a new task with context from the current task",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "deep-planning",
		description: "Create a comprehensive implementation plan before coding",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "smol",
		description: "Condenses your current context window",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "newrule",
		description: "Create a new Cline rule based on your conversation",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "reportbug",
		description: "Create a Github issue with Cline",
		section: "default",
		cliCompatible: true,
	},
]

// VS Code-only slash commands
export const VSCODE_ONLY_COMMANDS: SlashCommand[] = []

// Academic research slash commands
export const ACADEMIC_SLASH_COMMANDS: SlashCommand[] = [
	{
		name: "deep-research",
		description: "ARS 深度研究：研究选题、文献综述、事实核查、系统综述和 Socratic 研究引导",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "academic-paper",
		description: "ARS 论文写作：论文规划、提纲、全文写作、修订、摘要、引用和格式转换",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "academic-paper-reviewer",
		description: "ARS 模拟审稿：多视角同行评审、方法审查、复审和修订路线图",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "ars-full",
		description: "ARS 科研全流程：从研究到写作、完整性检查、审稿、修订和定稿",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "ars-plan",
		description: "ARS 论文规划：通过引导式对话形成章节计划、论点和证据地图",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "ars-outline",
		description: "ARS 论文提纲：生成或重组详细论文结构与证据映射",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "ars-reviewer",
		description: "ARS 模拟审稿：以编辑和多位审稿人视角生成评审报告",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "ars-citation-check",
		description: "ARS 引用核查：检查文内引用、参考文献列表、格式和论证支撑",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "ars-format-convert",
		description: "ARS 格式转换/检查：核对投稿格式、模板要求、文档格式和引用样式",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "ars-revision-coach",
		description: "ARS 修订教练：解析审稿意见并生成修订路线图和回复信骨架",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "scientific-toolkit-skill",
		description: "实验助手：MATLAB/Python 仿真、统计、机器学习、优化和论文配图",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "office-academic-skill",
		description: "Word/PPT 助手：学术报告、组会 PPT、开题/中期/答辩材料",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "nature-polishing",
		description: "文章润色：中英文学术表达、Nature 风格英文润色、逻辑衔接和 LaTeX 排版",
		section: "default",
		cliCompatible: true,
	},
]
