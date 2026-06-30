/**
 * React hook for translation — uses shared locale state from index.ts
 */
import { useSyncExternalStore, useCallback } from "react"
import { t as translateFn, subscribeToLocale, getLocaleSnapshot, setLocale as setLocaleImpl, type Locale } from "./index"

/**
 * React hook that provides the `t()` translation function and locale utilities.
 * Re-renders when the locale changes (e.g. after preferredLanguage updates).
 */
export function useTranslation() {
	const locale = useSyncExternalStore(subscribeToLocale, getLocaleSnapshot, () => "en" as Locale)

	const translate = useCallback(
		(key: string, defaultValue: string, vars?: Record<string, string | number>): string => {
			return translateFn(key, defaultValue, vars)
		},
		[locale],
	)

	const switchLocale = useCallback(async (newLocale: Locale) => {
		await setLocaleImpl(newLocale)
	}, [])

	return {
		t: translate,
		locale,
		switchLocale,
		isChinese: locale === "zh-cn",
	}
}
