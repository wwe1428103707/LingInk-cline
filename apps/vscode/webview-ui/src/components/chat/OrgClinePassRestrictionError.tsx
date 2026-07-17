import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import { useState } from "react"
import { t } from "@/i18n"
import { AccountServiceClient } from "@/services/grpc-client"

const OrgClinePassRestrictionError = () => {
	const [isSwitching, setIsSwitching] = useState(false)
	const [didSwitch, setDidSwitch] = useState(false)
	const [error, setError] = useState<string | undefined>()
	const ORG_CLINE_PASS_RESTRICTION_MESSAGE = t(
		"orgRestriction.message",
		"Organization accounts cannot use LingInk Pass subscriptions.",
	)

	const handleSwitchToPersonalAccount = async () => {
		setIsSwitching(true)
		setError(undefined)
		try {
			await AccountServiceClient.setUserOrganization({})
			setDidSwitch(true)
		} catch (error) {
			console.error("Failed to switch to personal LingInk account:", error)
			setError(t("orgRestriction.failed", "Failed to switch account. Use /accounts to switch to your personal account."))
		} finally {
			setIsSwitching(false)
		}
	}

	return (
		<div className="p-2 border-none rounded-md mb-2 bg-quote" data-testid="org-cline-pass-restriction-error">
			<div className="text-error mb-2">Organization account cannot use LingInk Pass</div>
			<div className="text-description text-xs wrap-anywhere">{ORG_CLINE_PASS_RESTRICTION_MESSAGE}</div>
			<VSCodeButton className="w-full mt-3" disabled={isSwitching || didSwitch} onClick={handleSwitchToPersonalAccount}>
				{isSwitching ? "Switching..." : didSwitch ? "Switched to personal account" : "Switch to personal account"}
			</VSCodeButton>
			{didSwitch && <div className="text-description text-xs mt-2">Retry the request after switching.</div>}
			{error && <div className="text-error text-xs mt-2">{error}</div>}
		</div>
	)
}

export default OrgClinePassRestrictionError
