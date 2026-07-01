import { AlertCircleIcon } from "lucide-react"
import { useCallback, useRef } from "react"
import ClineLogoWhite from "@/assets/ClineLogoWhite"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/i18n"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { StateServiceClient } from "@/services/grpc-client"
import ApiConfigurationSection from "../settings/sections/ApiConfigurationSection"
const OnboardingView = () => {
	const { t } = useTranslation()
	const { hideSettings, hideAccount, setShowWelcome } = useExtensionState()
	const completedRef = useRef(false)

	const handleContinue = useCallback(async () => {
		if (completedRef.current) return
		completedRef.current = true

		await StateServiceClient.setWelcomeViewCompleted({ value: true }).catch(() => {})
		setShowWelcome(false)
		hideAccount()
		hideSettings()
	}, [hideAccount, hideSettings, setShowWelcome])

	return (
		<div className="fixed inset-0 p-0 flex flex-col w-full">
			<div className="h-full px-5 xs:mx-10 overflow-auto flex flex-col gap-4 items-center justify-center">
				<ClineLogoWhite className="size-16 flex-shrink-0" />
				<h2 className="text-lg font-semibold p-0 flex-shrink-0">{t("onboarding.configureProvider", "Configure your provider")}</h2>

				<div className="flex-1 w-full flex max-w-lg overflow-y-auto min-h-0">
					<ApiConfigurationSection />
				</div>

				<footer className="flex w-full max-w-lg flex-col gap-3 my-2 px-2 overflow-hidden flex-shrink-0">
					<Button className="w-full rounded-xs" onClick={handleContinue}>{t("onboarding.continue", "Continue")}</Button>

					<div className="items-center justify-center flex text-sm text-foreground gap-2 mb-3 text-pretty">
						<AlertCircleIcon className="shrink-0 size-2" /> {t("onboarding.changeLater", "You can change this later in settings")}
					</div>
				</footer>
			</div>
		</div>
	)
}

export default OnboardingView
