/**
 * # Network Support for Cline
 *
 * ## Development Guidelines
 *
 * **Do** use `import { fetch } from '@/shared/net'` instead of global `fetch`.
 *
 * Global `fetch` will appear to work in VSCode, but proxy support will be
 * broken in JetBrains or CLI.
 *
 * If you use Axios, **do** call `getAxiosSettings()` and spread into
 * your Axios configuration:
 *
 * ```typescript
 * import { getAxiosSettings } from '@/shared/net'
 * await axios.get(url, {
 *   headers: { 'X-FOO': 'BAR' },
 *   ...getAxiosSettings()
 * })
 * ```
 *
 * **Do** remember to pass our `fetch` into your API clients:
 *
 * ```typescript
 * import OpenAI from "openai"
 * import { fetch } from "@/shared/net"
 * this.client = new OpenAI({
 *   apiKey: '...',
 *   fetch, // Use configured fetch with proxy support
 * })
 * ```
 *
 * If you neglect this step, inference won't work in JetBrains and CLI
 * through proxies.
 *
 * ## Proxy Support
 *
 * Cline uses platform-specific fetch implementations to handle proxy
 * configuration:
 * - **VSCode**: Uses global fetch (VSCode provides proxy configuration)
 * - **JetBrains, CLI**: Uses undici fetch with explicit ProxyAgent
 *
 * Proxy configuration via standard environment variables:
 * - `http_proxy` / `HTTP_PROXY` - Proxy for HTTP requests
 * - `https_proxy` / `HTTPS_PROXY` - Proxy for HTTPS requests
 * - `no_proxy` / `NO_PROXY` - Comma-separated list of hosts to bypass proxy
 *
 * Note, `http_proxy` etc. MUST specify the protocol to use for the proxy,
 * for example, `https_proxy=http://proxy.corp.example:3128`. Simply specifying
 * the proxy hostname will result in errors.
 *
 * ## Certificate Trust
 *
 * Proxies often machine-in-the-middle HTTPS connections. To make this work,
 * they generate self-signed certificates for a host, and the client is
 * configured to trust the proxy as a certificate authority.
 *
 * VSCode transparently pulls trusted certificates from the operating system
 * and configures node trust.
 *
 * JetBrains exports trusted certificates from the OS and writes them to a
 * temporary file, then configures node TLS by setting NODE_EXTRA_CA_CERTS.
 *
 * CLI users should set the NODE_EXTRA_CA_CERTS environment variable if
 * necessary, because node does not automatically use the OS' trusted certs.
 *
 * ## Limitations in JetBrains & CLI
 *
 * - Proxy settings are static at startup--restart required for changes
 * - SOCKS proxies, PAC files not supported
 * - Proxy authentication via env vars only
 *
 * These are not fundamental limitations, they just need integration work.
 *
 * ## Troubleshooting
 *
 * 1. Verify proxy env vars: `echo $http_proxy $https_proxy`
 * 2. Check certificates: `echo $NODE_EXTRA_CA_CERTS` (should point to PEM file)
 * 3. View logs: Check ~/.cline/cline-core-service.log for network-related
 *    failures.
 * 4. Test connection: Use `curl -x host:port` etc. to isolate proxy
 *    configuration versus client issues.
 *
 * @example
 * ```typescript
 * // Good - uses configured fetch
 * import { fetch } from '@/shared/net'
 * const response = await fetch(url)
 *
 * // Good - configures axios to use configured fetch
 * import { getAxiosSettings } from '@/shared/net'
 * await axios.get(url, { ...getAxiosSettings() })
 * ```
 */

import { EnvHttpProxyAgent, ProxyAgent, setGlobalDispatcher, fetch as undiciFetch } from "undici"

type FetchFunction = (...args: Parameters<typeof globalThis.fetch>) => ReturnType<typeof globalThis.fetch>
export type NetworkProxyMode = "vscode" | "custom" | "off"
export type NetworkProxySettings = {
	mode?: NetworkProxyMode
	customProxyUrl?: string
	vscodeProxyUrl?: string
}
type NetworkProxySettingsProvider = () => NetworkProxySettings | undefined

let mockFetch: FetchFunction | undefined
let proxySettingsProvider: NetworkProxySettingsProvider | undefined
let cachedProxyAgent: { url: string; agent: ProxyAgent } | undefined

export function configureNetworkProxySettingsProvider(provider: NetworkProxySettingsProvider | undefined): void {
	proxySettingsProvider = provider
	cachedProxyAgent = undefined
}

export function resolveNetworkProxyUrl(settings = proxySettingsProvider?.()): string | undefined {
	if (!settings || settings.mode === "off") {
		return undefined
	}

	const candidate = settings.mode === "custom" ? settings.customProxyUrl : settings.vscodeProxyUrl
	const trimmed = candidate?.trim()
	if (trimmed) {
		return trimmed
	}

	// Fallback: check HTTP_PROXY/HTTPS_PROXY environment variables.
	// VS Code sets these based on http.proxy setting for the extension host process.
	return process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.https_proxy || process.env.http_proxy || undefined
}

function getProxyAgent(proxyUrl: string): ProxyAgent {
	if (cachedProxyAgent?.url === proxyUrl) {
		return cachedProxyAgent.agent
	}

	const agent = new ProxyAgent(proxyUrl)
	cachedProxyAgent = { url: proxyUrl, agent }
	return agent
}

function fetchWithProxy(
	baseFetch: typeof globalThis.fetch,
	input: string | URL | Request,
	init?: RequestInit,
): Promise<Response> {
	if (mockFetch) {
		return mockFetch(input, init)
	}

	const proxyUrl = resolveNetworkProxyUrl()
	if (!proxyUrl) {
		return baseFetch(input, init)
	}

	return (undiciFetch as any)(input, {
		...init,
		dispatcher: getProxyAgent(proxyUrl),
	}) as Promise<Response>
}

/**
 * Platform-configured fetch that respects proxy settings.
 * Use this instead of global fetch to ensure proper proxy configuration.
 *
 * @example
 * ```typescript
 * import { fetch } from '@/shared/net'
 * const response = await fetch('https://api.example.com')
 * ```
 */
export const fetch: typeof globalThis.fetch = (() => {
	// Note: Don't use Logger here; it may not be initialized.

	let baseFetch: typeof globalThis.fetch
	let useEnvProxy = false

	if (process.env.IS_STANDALONE === "true") {
		// Standalone (JetBrains/CLI): always configure EnvHttpProxyAgent.
		useEnvProxy = true
	} else {
		// VS Code extension: only configure EnvHttpProxyAgent when proxy env vars are set.
		// VS Code sets HTTP_PROXY/HTTPS_PROXY based on http.proxy setting for the extension host.
		useEnvProxy = !!(process.env.HTTP_PROXY || process.env.HTTPS_PROXY || process.env.http_proxy || process.env.https_proxy)
	}

	if (useEnvProxy) {
		// Configure undici with ProxyAgent that reads HTTP_PROXY/HTTPS_PROXY env vars
		const agent = new EnvHttpProxyAgent({})
		setGlobalDispatcher(agent)
		baseFetch = undiciFetch as any as typeof globalThis.fetch
	} else {
		baseFetch = globalThis.fetch
	}

	return ((input: string | URL | Request, init?: RequestInit): Promise<Response> =>
		fetchWithProxy(baseFetch, input, init)) as typeof globalThis.fetch
})()

/**
 * Mocks `fetch` for testing and calls `callback`. Then restores `fetch`. If the
 * specified callback returns a Promise, the fetch is restored when that Promise
 * is settled.
 * @param theFetch the replacement function to call to implement `fetch`.
 * @param callback `fetch` will be mocked for the duration of `callback()`.
 * @returns the result of `callback()`.
 */
export function mockFetchForTesting<T>(theFetch: FetchFunction, callback: () => T): T {
	const originalMockFetch = mockFetch
	mockFetch = theFetch
	let willResetSync = true
	try {
		const result = callback()
		if (result instanceof Promise) {
			willResetSync = false
			return result.finally(() => {
				mockFetch = originalMockFetch
			}) as typeof result
		}
		return result
	} finally {
		if (willResetSync) {
			mockFetch = originalMockFetch
		}
	}
}

/**
 * Returns axios configuration for fetch adapter mode with our configured fetch.
 * This ensures axios uses our platform-specific fetch implementation with
 * proper proxy configuration.
 *
 * @returns Configuration object with fetch adapter and configured fetch
 *
 * @example
 * ```typescript
 * const response = await axios.get(url, {
 *   headers: { Authorization: 'Bearer token' },
 *   timeout: 5000,
 *   ...getAxiosSettings()
 * })
 * ```
 */
export function getAxiosSettings(): {
	adapter?: any
	fetch?: typeof globalThis.fetch
	maxBodyLength?: number
	maxContentLength?: number
} {
	return {
		adapter: "fetch" as any,
		fetch, // Use our configured fetch
		maxBodyLength: Number.POSITIVE_INFINITY,
		maxContentLength: Number.POSITIVE_INFINITY,
	}
}
