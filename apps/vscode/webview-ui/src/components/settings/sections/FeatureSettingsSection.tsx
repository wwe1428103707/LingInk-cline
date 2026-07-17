import { EmptyRequest } from "@shared/proto/cline/common"
import type { AcademicSkillsUpdateInfo } from "@shared/proto/cline/state"
import { UpdateSettingsRequest } from "@shared/proto/cline/state"
import { VSCodeButton, VSCodeTextField } from "@vscode/webview-ui-toolkit/react"
import { memo, type ReactNode, useEffect, useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { PLATFORM_CONFIG } from "@/config/platform.config"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { useTranslation } from "@/i18n"
import { StateServiceClient } from "@/services/grpc-client"
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

	const { t } = useTranslation()
	const {
		enableCheckpointsSetting,
		useAutoCondense,
		backgroundEditEnabled,
		showFeatureTips,
		networkProxyMode,
		networkProxyUrl,
	} = useExtensionState()

	const agentFeatures: FeatureToggle[] = [
		{
			id: "auto-compact",
			label: t("settings.autoCompact", "Auto Compact"),
			description: t("settings.autoCompact.desc", "Automatically compress conversation history."),
			stateKey: "useAutoCondense",
			settingKey: "useAutoCondense",
		},
	]

	const editorFeatures: FeatureToggle[] = [
		{
			id: "show-feature-tips",
			label: t("settings.featureTips", "Feature Tips"),
			description: t(
				"settings.featureTips.desc",
				"Show rotating tips during the thinking phase to help you discover LingInk features.",
			),
			stateKey: "showFeatureTips",
			settingKey: "showFeatureTips",
		},
		{
			id: "background-edit",
			label: t("settings.backgroundEdit", "Background Edit"),
			description: t("settings.backgroundEdit.desc", "Allow edits without stealing editor focus"),
			stateKey: "backgroundEditEnabled",
			settingKey: "backgroundEditEnabled",
		},
		{
			id: "checkpoints",
			label: t("settings.checkpoints", "Checkpoints"),
			description: t("settings.checkpoints.desc", "Save progress at key points for easy rollback"),
			stateKey: "enableCheckpointsSetting",
			settingKey: "enableCheckpointsSetting",
		},
	]
	const [installError, setInstallError] = useState<string | null>(null)
	const [skillsInstalled, setSkillsInstalled] = useState<boolean | null>(null)
	const [installSuccess, setInstallSuccess] = useState(false)

	const [checking, setChecking] = useState(false)
	const [updating, setUpdating] = useState(false)
	const [updateInfo, setUpdateInfo] = useState<AcademicSkillsUpdateInfo | null>(null)
	const [proxyUrlDraft, setProxyUrlDraft] = useState(networkProxyUrl ?? "")

	const handleCheckUpdate = async () => {
		setChecking(true)
		setUpdateInfo(null)
		try {
			const info = await StateServiceClient.checkAcademicSkillsUpdate(EmptyRequest.create({}))
			setUpdateInfo(info)
		} catch (error) {
			console.error("Failed to check updates:", error)
			setUpdateInfo({
				hasUpdate: false,
				currentVersion: "unknown",
				latestVersion: "unknown",
				releaseUrl: "",
			})
		} finally {
			setChecking(false)
		}
	}

	const handleUpdate = async () => {
		setUpdating(true)
		try {
			await StateServiceClient.updateAcademicSkills(EmptyRequest.create({}))
			// Clear cached info so user can check again
			setUpdateInfo(null)
		} catch (error) {
			console.error("Failed to update skills:", error)
		} finally {
			setUpdating(false)
		}
	}

	useEffect(() => {
		PLATFORM_CONFIG.postMessage({ type: "checkSkillsInstalled" })
		const handler = (event: MessageEvent) => {
			const data = event.data
			if (data?.type === "installSkillsResult") {
				setInstallingSkills(false)
				const result = data.installSkillsResult
				if (result && !result.success) {
					setInstallError(
						result.error ||
							t(
								"settings.academicSkills.installFailed",
								"Installation failed. Check the console logs for details.",
							),
					)
					setSkillsInstalled(false)
				} else {
					setInstallError(null)
					setSkillsInstalled(true)
					setInstallSuccess(true)
					setTimeout(() => setInstallSuccess(false), 4000)
				}
			} else if (data?.type === "checkSkillsInstalledResult") {
				setSkillsInstalled(data.checkSkillsInstalledResult?.installed ?? false)
			}
		}
		window.addEventListener("message", handler)
		return () => window.removeEventListener("message", handler)
	}, [])

	useEffect(() => {
		setProxyUrlDraft(networkProxyUrl ?? "")
	}, [networkProxyUrl])

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
						<div className="text-xs font-medium text-foreground/80 uppercase tracking-wider mb-3">
							{t("settings.features.section.agent", "Agent")}
						</div>
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
						<div className="text-xs font-medium text-foreground/80 uppercase tracking-wider mb-3">
							{t("settings.features.section.editor", "Editor")}
						</div>
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

				<div>
					<div className="text-xs font-medium text-foreground/80 uppercase tracking-wider mb-3">
						{t("settings.features.section.network", "Network")}
					</div>
					<div className="relative p-3 my-3 rounded-md border border-editor-widget-border/50 space-y-3">
						<div className="flex flex-col gap-2">
							<label className="text-xs text-foreground/90" htmlFor="network-proxy-mode">
								{t("settings.networkProxy.mode", "Proxy mode")}
							</label>
							<select
								className="w-full bg-(--vscode-dropdown-background) text-(--vscode-dropdown-foreground) border border-(--vscode-dropdown-border) rounded-sm px-2 py-1 text-xs"
								id="network-proxy-mode"
								onChange={(event) =>
									updateSetting("networkProxyMode", event.currentTarget.value as "vscode" | "custom" | "off")
								}
								value={networkProxyMode ?? "vscode"}>
								<option value="vscode">
									{t("settings.networkProxy.mode.vscode", "Use VS Code proxy settings")}
								</option>
								<option value="custom">{t("settings.networkProxy.mode.custom", "Use LingInk proxy")}</option>
								<option value="off">{t("settings.networkProxy.mode.off", "Disable LingInk proxy")}</option>
							</select>
							<p className="text-xs text-description">
								{t(
									"settings.networkProxy.desc",
									"Applies to LingInk network requests such as Academic Research Skills update checks and downloads.",
								)}
							</p>
						</div>
						{networkProxyMode === "custom" && (
							<div className="flex flex-col gap-2">
								<label className="text-xs text-foreground/90" htmlFor="network-proxy-url">
									{t("settings.networkProxy.url", "Proxy URL")}
								</label>
								<VSCodeTextField
									className="w-full"
									id="network-proxy-url"
									onBlur={(event) => {
										const input = event.currentTarget as HTMLInputElement
										updateSetting("networkProxyUrl", input.value)
									}}
									onInput={(event) => {
										const input = event.currentTarget as HTMLInputElement
										setProxyUrlDraft(input.value)
									}}
									onKeyDown={(event) => {
										const input = event.currentTarget as HTMLInputElement
										if (event.key === "Enter") {
											updateSetting("networkProxyUrl", input.value)
										}
									}}
									placeholder="http://127.0.0.1:7890"
									value={proxyUrlDraft}
								/>
							</div>
						)}
					</div>
				</div>

				{/* LingInk bundled academic skills */}
				<div>
					<div className="text-xs font-medium text-foreground/80 uppercase tracking-wider mb-3">
						{t("settings.academicSkills.section", "LingInk Bundled Academic Skills")}
					</div>
					<div className="relative p-3 my-3 rounded-md border border-editor-widget-border/50 space-y-2">
						<p className="text-xs text-muted-foreground">
							{t(
								"settings.academicSkills.desc",
								"Install all bundled skills from the bundled-skills directory, including ARS academic research skills, polishing skills, experiment assistant, and Word/PPT assistants. They support literature reviews, paper writing, MATLAB/Python simulation analysis, paper figures, reading reports, and group meeting, proposal, midterm, and defense presentations.",
							)}
						</p>
						{skillsInstalled === true ? (
							<div className="flex items-center gap-2">
								<span className="text-xs text-success">
									{t("settings.academicSkills.installed", "✓ Installed")}
								</span>
								<VSCodeButton
									appearance="secondary"
									disabled={installingSkills}
									onClick={() => {
										setInstallingSkills(true)
										PLATFORM_CONFIG.postMessage({ type: "installSkills" })
									}}>
									{installingSkills
										? t("settings.academicSkills.installing", "Installing...")
										: t("settings.academicSkills.reinstall", "Reinstall")}
								</VSCodeButton>
							</div>
						) : (
							<VSCodeButton
								appearance="primary"
								disabled={installingSkills || skillsInstalled === null}
								onClick={() => {
									setInstallingSkills(true)
									PLATFORM_CONFIG.postMessage({ type: "installSkills" })
								}}>
								{installingSkills
									? t("settings.academicSkills.installing", "Installing...")
									: skillsInstalled === null
										? t("settings.academicSkills.checking", "Checking...")
										: t("settings.academicSkills.install", "Install Bundled Academic Skills")}
							</VSCodeButton>
						)}
						{installSuccess && (
							<p className="text-xs text-success mt-1">
								{t(
									"settings.academicSkills.installSuccess",
									"✓ Installed successfully! Restart the LingInk session to start using them.",
								)}
							</p>
						)}
						{installError && <p className="text-xs text-error mt-1">{installError}</p>}

						{/* Check Update */}
						<div className="flex gap-2 pt-1">
							<VSCodeButton appearance="secondary" disabled={checking || updating} onClick={handleCheckUpdate}>
								{checking
									? t("settings.academicSkills.checking", "Checking...")
									: t("settings.academicSkills.checkUpdate", "Check for Updates")}
							</VSCodeButton>
						</div>

						{updateInfo && (
							<div className="p-2 rounded-sm border border-(--vscode-panel-border)">
								{updateInfo.error ? (
									<p className="text-sm text-(--vscode-errorForeground)">⚠️ {updateInfo.error}</p>
								) : updateInfo.hasUpdate ? (
									<>
										<p className="text-sm font-medium text-(--vscode-terminal-ansiYellow)">
											{t(
												"settings.academicSkills.updateAvailable",
												"📦 New version available: v{currentVersion} → v{latestVersion}",
												{
													currentVersion: updateInfo.currentVersion,
													latestVersion: updateInfo.latestVersion,
												},
											)}
										</p>
										{updateInfo.releaseNotes && (
											<p className="text-xs text-description mt-1 line-clamp-3">
												{updateInfo.releaseNotes.slice(0, 300)}
											</p>
										)}
										<div className="flex gap-2 mt-2">
											<VSCodeButton appearance="primary" disabled={updating} onClick={handleUpdate}>
												{updating
													? t("settings.academicSkills.updating", "Updating...")
													: t("settings.academicSkills.update", "Update")}
											</VSCodeButton>
											<VSCodeButton
												appearance="secondary"
												onClick={() => window.open(updateInfo.releaseUrl, "_blank")}>
												{t("settings.academicSkills.releaseNotes", "Release Notes")}
											</VSCodeButton>
										</div>
									</>
								) : (
									<p className="text-sm text-(--vscode-terminal-ansiGreen)">
										{t("settings.academicSkills.upToDate", "✅ Already up to date (v{currentVersion})", {
											currentVersion: updateInfo.currentVersion,
										})}
									</p>
								)}
							</div>
						)}
					</div>
				</div>
			</Section>
		</div>
	)
}
export default memo(FeatureSettingsSection)
