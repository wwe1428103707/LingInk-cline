/**
 * I18nProvider - initializes translations on app mount
 * and re-initializes when preferredLanguage changes.
 *
 * Uses loadTranslations which internally calls setLocale,
 * which notifies all useSyncExternalStore subscribers.
 */
import React, { useEffect, useState } from "react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { loadTranslations } from "./index"

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [ready, setReady] = useState(false)
	const { preferredLanguage } = useExtensionState()

	useEffect(() => {
		let cancelled = false
		setReady(false)
		loadTranslations(preferredLanguage).then(() => {
			if (!cancelled) {
				setReady(true)
			}
		})
		return () => {
			cancelled = true
		}
	}, [preferredLanguage])

	// Hold rendering until the active locale's translations are loaded,
	// otherwise Chinese users see an English flash before the zh-cn chunk arrives.
	if (!ready) {
		return null
	}

	return <>{children}</>
}
