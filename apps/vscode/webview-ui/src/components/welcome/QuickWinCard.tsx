import {
	BookOpenTextIcon,
	FileTextIcon,
	FlaskConicalIcon,
	HighlighterIcon,
	type LucideIcon,
	MessageSquareReplyIcon,
	PresentationIcon,
	SparklesIcon,
} from "lucide-react"
import React from "react"
import { QuickWinTask } from "./quickWinTasks"

interface QuickWinCardProps {
	task: QuickWinTask
	onExecute: () => void
}

const iconMap: Record<string, LucideIcon> = {
	OutlineIcon: FileTextIcon,
	LiteratureIcon: BookOpenTextIcon,
	PolishIcon: HighlighterIcon,
	ReviewIcon: MessageSquareReplyIcon,
	ExperimentIcon: FlaskConicalIcon,
	PresentationIcon: PresentationIcon,
}

const renderIcon = (iconName?: string) => {
	const Icon = iconName ? iconMap[iconName] || SparklesIcon : SparklesIcon
	return <Icon aria-hidden="true" className="size-4.5" strokeWidth={1.8} />
}

const QuickWinCard: React.FC<QuickWinCardProps> = ({ task, onExecute }) => {
	return (
		<button
			className="group mb-2 flex w-full cursor-pointer appearance-none items-center space-x-3 rounded-full border border-(--vscode-panel-border) bg-white/2 px-5 py-1 text-left transition-colors duration-150 ease-in-out hover:bg-(--vscode-list-hoverBackground)"
			onClick={() => onExecute()}
			type="button">
			<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-(--vscode-badge-background)/15 text-(--vscode-icon-foreground)">
				{renderIcon(task.icon)}
			</span>

			<span className="min-w-0 grow">
				<span className="mb-0 mt-0 block truncate pt-3 font-medium text-(--vscode-editor-foreground) text-sm leading-tight">
					{task.title}
				</span>
				<span className="mt-px block truncate text-description text-xs leading-tight">{task.description}</span>
			</span>
		</button>
	)
}

export default QuickWinCard
