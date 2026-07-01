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
		name: "research-topic",
		description: "研究选题引导：根据您的领域提供选题建议和研究方向分析",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "lit-review",
		description: "文献检索与综述：检索相关文献并生成结构化文献综述",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "paper-structure",
		description: "论文结构重组：分析并优化您的论文大纲和章节结构",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "english-polish",
		description: "学术英文润色：对选中文本进行学术英语润色和表达优化",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "logic-scan",
		description: "论证漏洞扫描：检查论文中的逻辑漏洞、论证不足和方法缺陷",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "peer-review",
		description: "模拟同行评审：以审稿人视角对论文进行全面评审并生成评审报告",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "citation-check",
		description: "引用与论证核查：检查引用格式、论证支撑和参考文献完整性",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "format-check",
		description: "投稿格式检查：检查论文格式是否符合目标期刊的投稿要求",
		section: "default",
		cliCompatible: true,
	},
]
