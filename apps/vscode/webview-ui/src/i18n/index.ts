/**
 * 国际化 / Internationalization (i18n) for LingInk webview UI
 *
 * This module provides a simple translation system.
 * Language is auto-detected from VS Code UI locale + preferredLanguage setting.
 * Fallback is 简体中文 (zh-cn) — LingInk is Chinese-first; any key missing
 * from zh-cn.ts falls back to the English defaultValue at the call site.
 */

// Supported locales
export type Locale = "en" | "zh-cn"

let currentLocale: Locale = "zh-cn"
let translations: Record<string, string> = {}

// Locale change listeners (for React hook sync)
const localeListeners: Set<() => void> = new Set()

function notifyLocaleListeners() {
	localeListeners.forEach((cb) => cb())
}

/** Subscribe to locale changes (for useSyncExternalStore) */
export function subscribeToLocale(callback: () => void): () => void {
	localeListeners.add(callback)
	return () => {
		localeListeners.delete(callback)
	}
}

/** Get snapshot of current locale */
export function getLocaleSnapshot(): Locale {
	return currentLocale
}

/**
 * Detect locale from: preferredLanguage setting → VS Code HTML lang → navigator.language.
 * LingInk is Chinese-first: when nothing indicates a language, default to zh-cn.
 */
export function detectLocale(preferredLanguage?: string): Locale {
	if (preferredLanguage) {
		const lower = preferredLanguage.toLowerCase()
		if (lower.includes("chinese") || lower.includes("简体中文") || lower.includes("繁體中文")) {
			return "zh-cn"
		}
		if (lower === "english") {
			return "en"
		}
	}
	if (typeof document !== "undefined") {
		const htmlLang = document.documentElement.lang?.toLowerCase()
		if (htmlLang?.startsWith("zh")) return "zh-cn"
		if (htmlLang?.startsWith("en")) return "en"
	}
	if (typeof navigator !== "undefined") {
		const lang = navigator.language?.toLowerCase()
		if (lang?.startsWith("zh")) return "zh-cn"
		if (lang?.startsWith("en")) return "en"
	}
	return "zh-cn"
}

/**
 * Set locale, load translations, and notify all listeners.
 * This is the one true way to change the locale.
 */
export async function setLocale(locale: Locale): Promise<void> {
	currentLocale = locale

	if (locale === "zh-cn") {
		try {
			const { zhCN } = await import("./zh-cn")
			translations = zhCN
		} catch {
			translations = {}
		}
	} else {
		translations = {}
	}

	notifyLocaleListeners()
}

/**
 * Load translations based on preferredLanguage setting.
 * Called once on app startup by I18nProvider.
 */
export async function loadTranslations(preferredLanguage?: string): Promise<void> {
	const locale = detectLocale(preferredLanguage)
	await setLocale(locale)
}

/**
 * Translate a key. Falls back to defaultValue if translation is missing.
 * Supports simple {variable} interpolation.
 */
export function t(key: string, defaultValue: string, vars?: Record<string, string | number>): string {
	let text = translations[key] ?? defaultValue

	if (vars) {
		for (const [k, v] of Object.entries(vars)) {
			text = text.replace(`{${k}}`, String(v))
		}
	}

	return text
}

/** Get the currently active locale */
export function getLocale(): Locale {
	return currentLocale
}

export { useTranslation } from "./useTranslation"
