import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import { UpdateSettingsRequest } from "@shared/proto/cline/state"
import { memo, useEffect, useState, type ReactNode } from "react"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useExtensionState } from "@/context/ExtensionStateContext"
import Section from "../Section"
import { updateSetting } from "../utils/settingsHandlers"

// Reusable checkbox component for feature settings
interface FeatureCheckboxProps {
	checked: boolean | undefined
	onChange: (checked: boolean) => void
	label: string
	description: ReactNode
	disabled?: boolean
	isRemoteLocked?: boolean
	remoteTooltip?: string
	isVisible?: boolean
}

// Interface for feature toggle configuration
interface FeatureToggle {
	id: string
	label: string
	description: ReactNode
	settingKey: keyof UpdateSettingsRequest
	stateKey: string
}

const agentFeatures: FeatureToggle[] = [
	{
		id: "auto-compact",
		label: "Auto Compact",
		description: "Automatically compress conversation history.",
		stateKey: "useAutoCondense",
		settingKey: "useAutoCondense",
	},
]

const editorFeatures: FeatureToggle[] = [
	{
		id: "show-feature-tips",
		label: "Feature Tips",
		description: "Show rotating tips during the thinking phase to help you discover Cline features.",
		stateKey: "showFeatureTips",
		settingKey: "showFeatureTips",
	},
	{
		id: "background-edit",
		label: "Background Edit",
		description: "Allow edits without stealing editor focus",
		stateKey: "backgroundEditEnabled",
		settingKey: "backgroundEditEnabled",
	},
	{
		id: "checkpoints",
		label: "论文版本快照",
		description: "Save progress at key points for easy rollback",
		stateKey: "enableCheckpointsSetting",
		settingKey: "enableCheckpointsSetting",
	},
]

const FeatureRow = memo(
	({
		checked = false,
		onChange,
		label,
		description,
		disabled,
		isRemoteLocked,
		isVisible = true,
		remoteTooltip,
	}: FeatureCheckboxProps) => {
		if (!isVisible) {
			return null
		}

		const checkbox = (
			<div className="flex items-center justify-between w-full">
				<div>{label}</div>
				<div>
					<Switch
						checked={checked}
						className="shrink-0"
						disabled={disabled || isRemoteLocked}
						id={label}
						onCheckedChange={onChange}
						size="lg"
					/>
					{isRemoteLocked && <i className="codicon codicon-lock text-description text-sm" />}
				</div>
			</div>
		)

		return (
			<div className="flex flex-col items-start justify-between gap-4 py-3 w-full">
				<div className="space-y-0.5 flex-1 w-full">
					{isRemoteLocked ? (
						<Tooltip>
							<TooltipTrigger asChild>{checkbox}</TooltipTrigger>
							<TooltipContent className="max-w-xs" side="top">
								{remoteTooltip}
							</TooltipContent>
						</Tooltip>
					) : (
						checkbox
					)}
				</div>
				<div className="text-xs text-description">{description}</div>
			</div>
		)
	},
)

interface FeatureSettingsSectionProps {
	renderSectionHeader: (tabId: string) => JSX.Element | null
}

const FeatureSettingsSection = ({ renderSectionHeader }: FeatureSettingsSectionProps) => {
	const [installingSkills, setInstallingSkills] = useState(false)
	useEffect(() => {
		const handler = (event: MessageEvent) => {
			if (event.data?.type === "installSkillsResult") {
				setInstallingSkills(false)
			}
		}
		window.addEventListener("message", handler)
		return () => window.removeEventListener("message", handler)
	}, [])
	const {
		enableCheckpointsSetting,
		useAutoCondense,
		backgroundEditEnabled,
		showFeatureTips,
	} = useExtensionState()

	// State lookup for mapped features
	const featureState: Record<string, boolean | undefined> = {
		showFeatureTips,
		enableCheckpointsSetting,
		useAutoCondense,
		backgroundEditEnabled,
	}

	return (
		<div className="mb-2">
			{renderSectionHeader("features")}
			<Section>
				<div className="mb-5 flex flex-col gap-3">
					{/* Core features */}
					<div>
						<div className="text-xs font-medium text-foreground/80 uppercase tracking-wider mb-3">Agent</div>
						<div
							className="relative p-3 pt-0 my-3 rounded-md border border-editor-widget-border/50"
							id="agent-features">
							{agentFeatures.map((feature) => (
								<FeatureRow
									checked={featureState[feature.stateKey]}
									description={feature.description}
									key={feature.id}
									label={feature.label}
									onChange={(checked) => updateSetting(feature.settingKey, checked)}
								/>
							))}
						</div>
					</div>

					{/* Editor features */}
					<div>
						<div className="text-xs font-medium text-foreground/80 uppercase tracking-wider mb-3">Editor</div>
						<div
							className="relative p-3 pt-0 my-3 rounded-md border border-editor-widget-border/50"
							id="optional-features">
							{editorFeatures.map((feature) => (
								<FeatureRow
									checked={featureState[feature.stateKey]}
									description={feature.description}
									key={feature.id}
									label={feature.label}
									onChange={(checked) => updateSetting(feature.settingKey, checked)}
								/>
							))}
						</div>
					</div>
				</div>

			{/* LingInk ARS Skills */}
			<div>
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
export default memo(FeatureSettingsSection)
