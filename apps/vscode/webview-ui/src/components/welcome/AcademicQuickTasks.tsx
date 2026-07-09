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
} from "lucide-react"
import React from "react"

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

const academicTasks: AcademicTask[] = [
	{
		id: "topic-selection",
		icon: LightbulbIcon,
		title: "选题引导",
		description: "研究选题建议与方向分析",
		slashCommand: "/research-topic",
	},
	{
		id: "lit-review",
		icon: BookOpenTextIcon,
		title: "文献检索综述",
		description: "检索文献并生成结构化综述",
		slashCommand: "/lit-review",
	},
	{
		id: "experiment-assistant",
		icon: FlaskConicalIcon,
		title: "实验助手",
		description: "MATLAB/Python 仿真、信号处理、统计、机器学习与论文配图",
		slashCommand:
			"/scientific-toolkit-skill 请作为实验助手协助我完成科研计算任务。优先询问任务目标、数据或代码位置、物理量/单位、输入输出格式、期望图表和验证方式；可覆盖 MATLAB/Python 仿真、信号处理、统计分析、机器学习、优化、论文配图与可复现实验流程。不要编造实验参数或结果，必要时先列出假设和需要我补充的信息。",
	},
	{
		id: "office-academic-assistant",
		icon: PresentationIcon,
		title: "Word/PPT 助手",
		description: "文献阅读报告、组会 PPT、开题/中期/答辩 PPT",
		slashCommand:
			"/office-academic-skill 请作为 Word/PPT 助手协助我制作或修改学术交付物。优先询问用途、受众、时长/页数、模板要求、源文件和输出格式；可覆盖文献阅读报告、组会 PPT、课程汇报、开题/中期/答辩 PPT、DOCX/PPTX 生成与质量检查。默认中文表达，保留英文题名、公式、变量名和参考文献信息，并为关键结论标注来源。",
	},
	{
		id: "paper-structure",
		icon: GitBranchIcon,
		title: "论文结构重组",
		description: "优化论文大纲和章节结构",
		slashCommand: "/paper-structure",
	},
	{
		id: "article-polish",
		icon: LanguagesIcon,
		title: "文章润色",
		description: "中英文学术表达、逻辑衔接与行文风格优化",
		slashCommand: "/article-polish",
	},
	{
		id: "logic-scan",
		icon: ScanSearchIcon,
		title: "漏洞扫描",
		description: "检查论证逻辑漏洞和缺陷",
		slashCommand: "/logic-scan",
	},
	{
		id: "peer-review",
		icon: MessagesSquareIcon,
		title: "模拟审稿",
		description: "以审稿人视角全面评审论文",
		slashCommand: "/peer-review",
	},
	{
		id: "citation-check",
		icon: LinkIcon,
		title: "引用核查",
		description: "检查引用格式和论证支撑",
		slashCommand: "/citation-check",
	},
	{
		id: "format-check",
		icon: ClipboardCheckIcon,
		title: "投稿格式检查",
		description: "检查目标期刊投稿格式要求",
		slashCommand: "/format-check",
	},
]

const AcademicQuickTasks: React.FC<AcademicQuickTasksProps> = ({ onSelectTask }) => {
	return (
		<div className="px-4 pt-4 pb-2 select-none">
			<h2 className="text-sm font-medium mb-3 text-center text-foreground/70">科研快捷任务</h2>
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
				{academicTasks.map((task) => {
					const Icon = task.icon

					return (
						<button
							className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-(--vscode-panel-border) bg-white/2 hover:bg-(--vscode-list-hoverBackground) hover:border-(--vscode-focusBorder) transition-all duration-150 ease-in-out cursor-pointer text-left group"
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
							<span className="text-[10px] text-(--vscode-descriptionForeground) text-center leading-tight line-clamp-2">
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
