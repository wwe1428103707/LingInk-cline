import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import { PlugIcon, PuzzleIcon } from "lucide-react"

import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { useTranslation } from "@/i18n"
import Section from "../Section"
import { updateSetting } from "../utils/settingsHandlers"
import TerminalSettingsSection from "./TerminalSettingsSection"

interface AdvancedSettingsSectionProps {
	renderSectionHeader: (tabId: string) => JSX.Element | null
}

const AdvancedSettingsSection = ({ renderSectionHeader }: AdvancedSettingsSectionProps) => {
	const { t: translate } = useTranslation()

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
						{translate("settings.advanced.terminal", "Terminal Settings")}
					</div>
					<div className="relative p-3 my-3 rounded-md border border-editor-widget-border/50">
						<TerminalSettingsSection renderSectionHeader={() => null} showHeader={false} />
					</div>
				</div>

				{/* API: Plan/Act Separate Models */}
				<div className="mb-8">
					<div className="text-xs font-medium text-foreground/80 uppercase tracking-wider mb-3">
						{translate("settings.advanced.apiConfig", "API Configuration")}
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
									{translate("apiConfig.planActSeparateModels", "Use different models for Plan and Act modes")}
								</Label>
							</div>
							<p className="text-xs text-description mt-1">
								{translate(
									"apiConfig.planActSeparateModels.desc",
									"When enabled, you can configure separate models for Plan and Act modes.",
								)}
							</p>
						</div>
					</div>
				</div>

				{/* Experimental Features */}
				<div className="mb-8">
					<div className="text-xs font-medium text-warning/80 uppercase tracking-wider mb-3">
						{translate("settings.features.section.experimental", "Experimental")}
					</div>
					<div className="relative p-3 my-3 rounded-md border border-editor-widget-border/50">
						<div className="flex items-center justify-between w-full py-2">
							<div className="space-y-0.5 flex-1 w-full">
								<div className="flex items-center justify-between w-full">
									<div>{translate("settings.yoloMode", "Yolo Mode")}</div>
									<div>
										<Switch
											checked={
												isYoloRemoteLocked
													? (remoteConfigSettings?.yoloModeToggled ?? false)
													: (yoloModeToggled ?? false)
											}
											className="shrink-0"
											disabled={isYoloRemoteLocked}
											id="yolo-mode"
											onCheckedChange={(checked) => updateSetting("yoloModeToggled", checked)}
											size="lg"
										/>
									</div>
								</div>
								<p className="text-xs text-description mt-1">
									{translate(
										"settings.yoloMode.desc",
										"Execute tasks without user confirmation. Automatically switches from Plan mode to Act mode and disables the question tool. Use with extreme caution.",
									)}
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* Advanced Features */}
				<div className="mb-8">
					<div className="text-xs font-medium text-foreground/80 uppercase tracking-wider mb-3">
						{translate("settings.advanced.features", "Advanced Features")}
					</div>
					<div className="relative p-3 my-3 rounded-md border border-editor-widget-border/50 space-y-4">
						{/* Hooks */}
						<div className="flex items-center justify-between w-full">
							<div className="space-y-0.5 flex-1 w-full">
								<div className="flex items-center justify-between w-full">
									<div>{translate("settings.hooks", "Hooks")}</div>
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
									{translate("settings.hooks.desc", "Enable lifecycle and tool hooks during task execution.")}
								</p>
							</div>
						</div>

						{/* Worktrees */}
						<div className="flex items-center justify-between w-full">
							<div className="space-y-0.5 flex-1 w-full">
								<div className="flex items-center justify-between w-full">
									<div>{translate("settings.worktrees", "Worktrees")}</div>
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
									{translate(
										"settings.worktrees.desc",
										"Enable git worktree management to run LingInk tasks in parallel.",
									)}
								</p>
							</div>
						</div>

						{/* MCP Display Mode */}
						<div className="space-y-2">
							<Label className="text-sm font-medium text-foreground">
								{translate("settings.mcpDisplayMode", "MCP Display Mode")}
							</Label>
							<p className="text-xs text-muted-foreground">
								{translate("settings.mcpDisplayMode.desc", "Controls how MCP responses are displayed.")}
							</p>
							<Select onValueChange={(v) => updateSetting("mcpDisplayMode", v)} value={mcpDisplayMode}>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="plain">
										{translate("settings.mcpDisplayMode.plain", "Plain Text")}
									</SelectItem>
									<SelectItem value="rich">{translate("settings.mcpDisplayMode.rich", "Rich Text")}</SelectItem>
									<SelectItem value="markdown">
										{translate("settings.mcpDisplayMode.markdown", "Markdown")}
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>

				{/* MCP / Plugin Management */}
				<div className="mb-8">
					<div className="text-xs font-medium text-foreground/80 uppercase tracking-wider mb-3">
						{translate("settings.advanced.tools", "Tool Management")}
					</div>
					<div className="relative p-3 my-3 rounded-md border border-editor-widget-border/50 space-y-3">
						<p className="text-xs text-muted-foreground">
							{translate(
								"settings.advanced.tools.desc",
								"Manage MCP server connections and installed plugins. MCP servers connect external APIs and local tools; plugins extend LingInk with additional functionality.",
							)}
						</p>
						<div className="flex flex-col gap-2">
							<VSCodeButton appearance="secondary" onClick={() => navigateToMarketplace()}>
								<PlugIcon className="w-4 h-4 mr-1" />
								{translate("settings.advanced.manageMcp", "Manage MCP Servers")}
							</VSCodeButton>
							<VSCodeButton appearance="secondary" onClick={() => navigateToMarketplace()}>
								<PuzzleIcon className="w-4 h-4 mr-1" />
								{translate("settings.advanced.managePlugins", "Manage Plugins")}
							</VSCodeButton>
						</div>
					</div>
				</div>
			</Section>
		</div>
	)
}

export default AdvancedSettingsSection
