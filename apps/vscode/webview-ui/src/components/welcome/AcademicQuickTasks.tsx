import {
	BookOpenTextIcon,
	ClipboardCheckIcon,
	GitBranchIcon,
	LanguagesIcon,
	LightbulbIcon,
	LinkIcon,
	type LucideIcon,
	MessagesSquareIcon,
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
		id: "paper-structure",
		icon: GitBranchIcon,
		title: "论文结构重组",
		description: "优化论文大纲和章节结构",
		slashCommand: "/paper-structure",
	},
	{
		id: "english-polish",
		icon: LanguagesIcon,
		title: "英文润色",
		description: "学术英语表达优化润色",
		slashCommand: "/english-polish",
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
