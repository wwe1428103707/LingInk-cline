/**
 * I18nProvider - initializes translations on app mount
 * and re-initializes when preferredLanguage changes.
 *
 * Uses loadTranslations which internally calls setLocale,
 * which notifies all useSyncExternalStore subscribers.
 */
import React, { useEffect, useState } from "react"
import { loadTranslations } from "./index"
import { useExtensionState } from "@/context/ExtensionStateContext"

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [ready, setReady] = useState(false)
	const { preferredLanguage } = useExtensionState()

	useEffect(() => {
		loadTranslations(preferredLanguage).then(() => setReady(true))
	}, [preferredLanguage])

	return <>{children}</>
}
