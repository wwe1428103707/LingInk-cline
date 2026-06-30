import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import { PlugIcon, PuzzleIcon } from "lucide-react"
import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useTranslation } from "@/i18n"
import { useExtensionState } from "@/context/ExtensionStateContext"
import Section from "../Section"
import TerminalSettingsSection from "./TerminalSettingsSection"
import { updateSetting } from "../utils/settingsHandlers"

interface AdvancedSettingsSectionProps {
	renderSectionHeader: (tabId: string) => JSX.Element | null
}

const AdvancedSettingsSection = ({ renderSectionHeader }: AdvancedSettingsSectionProps) => {
	const { t: translate } = useTranslation()
	const [installingSkills, setInstallingSkills] = useState(false)

	const {
		yoloModeToggled,
		hooksEnabled,
		mcpDisplayMode,
		worktreesEnabled,
		planActSeparateModelsSetting,
		remoteConfigSettings,
		navigateToMarketplace,
	} = useExtensionState()

	const isYoloRemoteLocked = remoteConfigSettings?.yoloModeToggled !== undefined

	return (
		<div>
			{renderSectionHeader("advanced")}
			<Section>
				{/* Terminal Settings */}
				<div className="mb-8">
					<div className="text-xs font-medium text-foreground/80 uppercase tracking-wider mb-3">
						{translate("settings.advanced.terminal", "终端设置")}
					</div>
					<div className="relative p-3 my-3 rounded-md border border-editor-widget-border/50">
						<TerminalSettingsSection renderSectionHeader={() => null} showHeader={false} />
					</div>
				</div>

				{/* API: Plan/Act Separate Models */}
				<div className="mb-8">
					<div className="text-xs font-medium text-foreground/80 uppercase tracking-wider mb-3">
						{translate("settings.advanced.apiConfig", "API 配置")}
					</div>
					<div className="relative p-3 my-3 rounded-md border border-editor-widget-border/50">
						<div className="mb-[5px]">
							<div className="flex items-center gap-2 mb-[5px]">
								<Switch
									checked={planActSeparateModelsSetting ?? false}
									className="shrink-0"
									id="planActSeparateModels"
									onCheckedChange={(checked) => updateSetting("planActSeparateModelsSetting", checked)}
									size="lg"
								/>
								<Label htmlFor="planActSeparateModels">
									{translate("apiConfig.planActSeparateModels", "计划和执行模式使用不同模型")}
								</Label>
							</div>
							<p className="text-xs text-description mt-1">
								{translate("apiConfig.planActSeparateModels.desc", "启用后，您可以为计划和执行模式分别配置不同的模型。")}
							</p>
						</div>
					</div>
				</div>

				{/* Experimental Features */}
				<div className="mb-8">
					<div className="text-xs font-medium text-warning/80 uppercase tracking-wider mb-3">
						{translate("settings.features.section.experimental", "实验功能")}
					</div>
					<div className="relative p-3 my-3 rounded-md border border-editor-widget-border/50">
						<div className="flex items-center justify-between w-full py-2">
							<div className="space-y-0.5 flex-1 w-full">
								<div className="flex items-center justify-between w-full">
									<div>{translate("settings.yoloMode", "Yolo 模式")}</div>
									<div>
										<Switch
											checked={isYoloRemoteLocked ? remoteConfigSettings?.yoloModeToggled ?? false : yoloModeToggled ?? false}
											className="shrink-0"
											disabled={isYoloRemoteLocked}
											id="yolo-mode"
											onCheckedChange={(checked) => updateSetting("yoloModeToggled", checked)}
											size="lg"
										/>
									</div>
								</div>
								<p className="text-xs text-description mt-1">
									{translate("settings.yoloMode.desc", "无需用户确认直接执行任务。自动从计划模式切换到执行模式并禁用提问工具。请极其谨慎地使用。")}
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* Advanced Features */}
				<div className="mb-8">
					<div className="text-xs font-medium text-foreground/80 uppercase tracking-wider mb-3">
						{translate("settings.advanced.features", "高级功能")}
					</div>
					<div className="relative p-3 my-3 rounded-md border border-editor-widget-border/50 space-y-4">
						{/* Hooks */}
						<div className="flex items-center justify-between w-full">
							<div className="space-y-0.5 flex-1 w-full">
								<div className="flex items-center justify-between w-full">
									<div>{translate("settings.hooks", "钩子")}</div>
									<div>
										<Switch
											checked={hooksEnabled ?? false}
											className="shrink-0"
											id="hooks-enabled"
											onCheckedChange={(checked) => updateSetting("hooksEnabled", checked)}
											size="lg"
										/>
									</div>
								</div>
								<p className="text-xs text-description mt-1">
									{translate("settings.hooks.desc", "在任务执行期间启用生命周期和工具钩子。")}
								</p>
							</div>
						</div>

						{/* Worktrees */}
						<div className="flex items-center justify-between w-full">
							<div className="space-y-0.5 flex-1 w-full">
								<div className="flex items-center justify-between w-full">
									<div>{translate("settings.worktrees", "工作树")}</div>
									<div>
										<Switch
											checked={worktreesEnabled?.user ?? false}
											className="shrink-0"
											disabled={!worktreesEnabled?.featureFlag}
											id="worktrees-enabled"
											onCheckedChange={(checked) => updateSetting("worktreesEnabled", checked)}
											size="lg"
										/>
									</div>
								</div>
								<p className="text-xs text-description mt-1">
									{translate("settings.worktrees.desc", "启用 git 工作树管理以并行运行 Cline 任务。")}
								</p>
							</div>
						</div>

						{/* MCP Display Mode */}
						<div className="space-y-2">
							<Label className="text-sm font-medium text-foreground">{translate("settings.mcpDisplayMode", "MCP 显示模式")}</Label>
							<p className="text-xs text-muted-foreground">{translate("settings.mcpDisplayMode.desc", "控制 MCP 响应的显示方式。")}</p>
							<Select onValueChange={(v) => updateSetting("mcpDisplayMode", v)} value={mcpDisplayMode}>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="plain">{translate("settings.mcpDisplayMode.plain", "纯文本")}</SelectItem>
									<SelectItem value="rich">{translate("settings.mcpDisplayMode.rich", "富文本显示")}</SelectItem>
									<SelectItem value="markdown">{translate("settings.mcpDisplayMode.markdown", "Markdown")}</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>

				{/* MCP / Plugin Management */}
				<div className="mb-8">
					<div className="text-xs font-medium text-foreground/80 uppercase tracking-wider mb-3">
						{translate("settings.advanced.tools", "工具管理")}
					</div>
					<div className="relative p-3 my-3 rounded-md border border-editor-widget-border/50 space-y-3">
						<p className="text-xs text-muted-foreground">
							管理 MCP 服务器连接和已安装的插件。MCP 服务器用于连接外部 API 和本地工具；插件用于扩展 Cline 的额外功能。
						</p>
						<div className="flex flex-col gap-2">
							<VSCodeButton
								appearance="secondary"
								onClick={() => navigateToMarketplace()}>
								<PlugIcon className="w-4 h-4 mr-1" />
								管理 MCP 服务器
							</VSCodeButton>
							<VSCodeButton
								appearance="secondary"
								onClick={() => navigateToMarketplace()}>
								<PuzzleIcon className="w-4 h-4 mr-1" />
								管理插件
							</VSCodeButton>
						</div>
					</div>
				</div>

				{/* ARS Skills (kept here for advanced users) */}
				<div className="mb-8">
					<div className="text-xs font-medium text-foreground/80 uppercase tracking-wider mb-3">
						灵砚 Academic Research Skills
					</div>
					<div className="relative p-3 my-3 rounded-md border border-editor-widget-border/50 space-y-2">
						<p className="text-xs text-muted-foreground">
							安装 deep-research、academic-paper、academic-paper-reviewer、academic-pipeline
							四个学术研究 Skill，支持文献综述、论文写作、同行评审等完整科研流程。
						</p>
						<VSCodeButton
							appearance="primary"
							disabled={installingSkills}
							onClick={() => {
								setInstallingSkills(true)
								window.postMessage({ type: "installSkills" }, "*")
							}}>
							{installingSkills ? "安装中..." : "📥 安装学术研究技能包"}
						</VSCodeButton>
					</div>
				</div>
			</Section>
		</div>
	)
}

export default AdvancedSettingsSection
