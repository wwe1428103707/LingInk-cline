import { t } from "@/i18n"
import Section from "../Section"

interface AboutSectionProps {
	version: string
	clineBaseVersion?: string
	renderSectionHeader: (tabId: string) => JSX.Element | null
}

const AboutSection = ({ version, clineBaseVersion, renderSectionHeader }: AboutSectionProps) => {
	return (
		<div>
			{renderSectionHeader("about")}
			<Section>
				<div className="flex px-4 flex-col gap-2">
					<h2 className="text-lg font-semibold">
						{t("about.title", "About LingInk")} v{version}
						{clineBaseVersion ? ` (core ${clineBaseVersion})` : ""}
					</h2>
					<p>
						{t(
							"about.description",
							"LingInk is an AI academic writing assistant for research planning, literature review, manuscript revision, citation support, and reviewer responses.",
						)}
					</p>
				</div>
			</Section>
		</div>
	)
}

export default AboutSection
