import { VSCodeButton, VSCodeLink } from "@vscode/webview-ui-toolkit/react"
import { useState } from "react"
import { t } from "@/i18n"
import Section from "../Section"
import { StateServiceClient } from "@/services/grpc-client"
import { EmptyRequest } from "@shared/proto/cline/common"
import type { AcademicSkillsUpdateInfo } from "@shared/proto/cline/state"

interface AboutSectionProps {
	version: string
	renderSectionHeader: (tabId: string) => JSX.Element | null
}

const AboutSection = ({ version, renderSectionHeader }: AboutSectionProps) => {
	const [installing, setInstalling] = useState(false)
	const [updating, setUpdating] = useState(false)
	const [checking, setChecking] = useState(false)
	const [updateInfo, setUpdateInfo] = useState<AcademicSkillsUpdateInfo | null>(null)

	const handleInstallSkills = async () => {
		setInstalling(true)
		try {
			await StateServiceClient.installBundledSkills(EmptyRequest.create({}))
		} catch (error) {
			console.error("Failed to install skills:", error)
		} finally {
			setInstalling(false)
		}
	}

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

	const currentVersion = updateInfo?.currentVersion
	const latestVersion = updateInfo?.latestVersion

	return (
		<div>
			{renderSectionHeader("about")}
			<Section>
				<div className="flex px-4 flex-col gap-2">
					<h2 className="text-lg font-semibold">{t("about.title", "Cline")} v{version}</h2>
					<p>
						{t("about.description", "An AI assistant that can use your CLI and Editor.")} Cline can handle complex software development tasks
						step-by-step with tools that let him create & edit files, explore large projects, use the browser, and
						execute terminal commands (after you grant permission).
					</p>

					<h3 className="text-md font-semibold">{t("about.community", "Community & Support")}</h3>
					<p>
						<VSCodeLink href="https://x.com/cline">X</VSCodeLink>
						{" • "}
						<VSCodeLink href="https://discord.gg/cline">Discord</VSCodeLink>
						{" • "}
						<VSCodeLink href="https://www.reddit.com/r/cline/"> r/cline</VSCodeLink>
					</p>

					<h3 className="text-md font-semibold">{t("about.development", "Development")}</h3>
					<p>
						<VSCodeLink href="https://github.com/cline/cline">GitHub</VSCodeLink>
						{" • "}
						<VSCodeLink href="https://github.com/cline/cline/issues"> {t("about.issues", "Issues")}</VSCodeLink>
						{" • "}
						<VSCodeLink href="https://github.com/cline/cline/discussions/categories/feature-requests?discussions_q=is%3Aopen+category%3A%22Feature+Requests%22+sort%3Atop">
							{" "}
							{t("about.featureRequests", "Feature Requests")}
						</VSCodeLink>
					</p>

					<h3 className="text-md font-semibold">{t("about.resources", "Resources")}</h3>
					<p>
						<VSCodeLink href="https://docs.cline.bot/">{t("about.documentation", "Documentation")}</VSCodeLink>
						{" • "}
						<VSCodeLink href="https://cline.bot/">https://cline.bot</VSCodeLink>
					</p>

					<h3 className="text-md font-semibold">灵砚 Academic Research Skills</h3>
					<p className="text-sm text-secondary">
						包含 deep-research、academic-paper、academic-paper-reviewer、academic-pipeline
						四个学术研究 Skill，支持文献综述、论文写作、同行评审等完整科研流程。
					</p>
					<p className="text-xs text-description">
						{currentVersion ? `当前版本: v${currentVersion}` : ""}
					</p>
					<div className="flex gap-2 flex-wrap">
						<VSCodeButton
							appearance="primary"
							disabled={installing}
							onClick={handleInstallSkills}>
							{installing ? "安装中..." : "📥 安装"}
						</VSCodeButton>
						<VSCodeButton
							appearance="secondary"
							disabled={checking || updating}
							onClick={handleCheckUpdate}>
							{checking ? "检查中..." : "🔄 检查更新"}
						</VSCodeButton>
					</div>

					{updateInfo && (
						<div className="mt-2 p-2 rounded-sm border border-(--vscode-panel-border)">
							{updateInfo.hasUpdate ? (
								<>
									<p className="text-sm font-medium text-(--vscode-terminal-ansiYellow)">
										📦 有新版本可用: v{currentVersion} → v{latestVersion}
									</p>
									{updateInfo.releaseNotes && (
										<p className="text-xs text-description mt-1 line-clamp-3">
											{updateInfo.releaseNotes.slice(0, 300)}
										</p>
									)}
									<div className="flex gap-2 mt-2">
										<VSCodeButton
											appearance="primary"
											disabled={updating}
											onClick={handleUpdate}>
											{updating ? "升级中..." : "⬆️ 升级"}
										</VSCodeButton>
										<VSCodeButton
											appearance="secondary"
											onClick={() => window.open(updateInfo.releaseUrl, "_blank")}>
											📖 发布说明
										</VSCodeButton>
									</div>
								</>
							) : (
								<p className="text-sm text-(--vscode-terminal-ansiGreen)">
									✅ 已是最新版本 (v{currentVersion})
								</p>
							)}
						</div>
					)}
				</div>
			</Section>
		</div>
	)
}

export default AboutSection
