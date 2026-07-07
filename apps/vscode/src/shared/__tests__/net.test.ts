import { afterEach, describe, it } from "bun:test"
import "should"
import { configureNetworkProxySettingsProvider, resolveNetworkProxyUrl } from "../net"

describe("network proxy settings", () => {
	afterEach(() => {
		configureNetworkProxySettingsProvider(undefined)
	})

	it("uses the VS Code http.proxy setting when configured to follow VS Code", () => {
		configureNetworkProxySettingsProvider(() => ({
			mode: "vscode",
			vscodeProxyUrl: "http://127.0.0.1:7890",
		}))

		resolveNetworkProxyUrl()!.should.equal("http://127.0.0.1:7890")
	})

	it("uses the plugin proxy URL when configured to use a custom proxy", () => {
		configureNetworkProxySettingsProvider(() => ({
			mode: "custom",
			customProxyUrl: "http://127.0.0.1:1080",
			vscodeProxyUrl: "http://127.0.0.1:7890",
		}))

		resolveNetworkProxyUrl()!.should.equal("http://127.0.0.1:1080")
	})

	it("ignores proxy settings when configured to disable plugin proxying", () => {
		configureNetworkProxySettingsProvider(() => ({
			mode: "off",
			customProxyUrl: "http://127.0.0.1:8888",
			vscodeProxyUrl: "http://127.0.0.1:7890",
		}))

		;(resolveNetworkProxyUrl() === undefined).should.be.true()
	})
})
