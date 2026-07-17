import React from "react"
import { useTranslation } from "@/i18n"
import QuickWinCard from "./QuickWinCard"
import { getQuickWinTasks, QuickWinTask } from "./quickWinTasks"

export const SuggestedTasks: React.FC<{ shouldShowQuickWins: boolean; onSelectQuickWin: (prompt: string) => void }> = ({
	shouldShowQuickWins,
	onSelectQuickWin,
}) => {
	const { t } = useTranslation()

	if (!shouldShowQuickWins) {
		return null
	}

	return (
		<div className="px-4 pt-1 pb-3 select-none">
			<h2 className="text-sm font-medium mb-2.5 text-center text-description">
				{t("welcome.quickWins.quick", "Quick")}{" "}
				<span className="text-foreground">{t("welcome.quickWins.wins", "[Wins]")}</span>{" "}
				{t("welcome.quickWins.with", "with LingInk")}
			</h2>
			<div className="flex flex-col space-y-1">
				{getQuickWinTasks(t).map((task: QuickWinTask) => (
					<QuickWinCard key={task.id} onExecute={() => onSelectQuickWin(task.prompt)} task={task} />
				))}
			</div>
		</div>
	)
}
