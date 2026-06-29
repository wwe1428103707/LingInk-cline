import { VSCodeButton, VSCodeLink } from "@vscode/webview-ui-toolkit/react"
import { useState } from "react"
import Section from "../Section"
import { StateServiceClient } from "@/services/grpc-client"
import { EmptyRequest } from "@shared/proto/cline/common"

interface AboutSectionProps {
	version: string
	renderSectionHeader: (tabId: string) => JSX.Element | null
}

const AboutSection = ({ version, renderSectionHeader }: AboutSectionProps) => {
	const [installing, setInstalling] = useState(false)

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

	return (
		<div>
			{renderSectionHeader("about")}
			<Section>
				<div className="flex px-4 flex-col gap-2">
					<h2 className="text-lg font-semibold">Cline v{version}</h2>
					<p>
						An AI assistant that can use your CLI and Editor. Cline can handle complex software development tasks
						step-by-step with tools that let him create & edit files, explore large projects, use the browser, and
						execute terminal commands (after you grant permission).
					</p>

					<h3 className="text-md font-semibold">Community & Support</h3>
					<p>
						<VSCodeLink href="https://x.com/cline">X</VSCodeLink>
						{" • "}
						<VSCodeLink href="https://discord.gg/cline">Discord</VSCodeLink>
						{" • "}
						<VSCodeLink href="https://www.reddit.com/r/cline/"> r/cline</VSCodeLink>
					</p>

					<h3 className="text-md font-semibold">Development</h3>
					<p>
						<VSCodeLink href="https://github.com/cline/cline">GitHub</VSCodeLink>
						{" • "}
						<VSCodeLink href="https://github.com/cline/cline/issues"> Issues</VSCodeLink>
						{" • "}
						<VSCodeLink href="https://github.com/cline/cline/discussions/categories/feature-requests?discussions_q=is%3Aopen+category%3A%22Feature+Requests%22+sort%3Atop">
							{" "}
							Feature Requests
						</VSCodeLink>
					</p>

					<h3 className="text-md font-semibold">Resources</h3>
					<p>
						<VSCodeLink href="https://docs.cline.bot/">Documentation</VSCodeLink>
						{" • "}
						<VSCodeLink href="https://cline.bot/">https://cline.bot</VSCodeLink>
					</p>

					<h3 className="text-md font-semibold">灵砚 Academic Research Skills</h3>
					<p className="text-sm text-secondary">
						包含 deep-research、academic-paper、academic-paper-reviewer、academic-pipeline
						四个学术研究 Skill，支持文献综述、论文写作、同行评审等完整科研流程。
					</p>
					<div>
						<VSCodeButton
							appearance="primary"
							disabled={installing}
							onClick={handleInstallSkills}>
							{installing ? "安装中..." : "📥 安装学术研究技能包"}
						</VSCodeButton>
					</div>
				</div>
			</Section>
		</div>
	)
}

export default AboutSection
