import { afterEach, beforeEach, describe, it } from "bun:test"
import "should"
import sinon from "sinon"
import { HostProvider } from "@/hosts/host-provider"
import { mockFetchForTesting } from "@/shared/net"
import { checkForARSUpdate } from "../skill-installer"

describe("skill-installer ARS updates", () => {
	let sandbox: sinon.SinonSandbox

	beforeEach(() => {
		sandbox = sinon.createSandbox()
		sandbox.stub(HostProvider, "get").returns({ extensionFsPath: "C:\\missing-extension-dir" } as any)
	})

	afterEach(() => {
		sandbox.restore()
	})

	it("fetches the latest ARS release through the shared network layer", async () => {
		const fetchStub = sandbox.stub().resolves({
			ok: true,
			json: async () => ({
				tag_name: "v9.9.9",
				html_url: "https://github.com/Imbad0202/academic-research-skills/releases/tag/v9.9.9",
				body: "Release notes",
			}),
		})

		await mockFetchForTesting(fetchStub, async () => {
			const result = await checkForARSUpdate("C:\\workspace")

			fetchStub.calledOnce.should.be.true()
			result.hasUpdate.should.be.true()
			result.latestVersion.should.equal("9.9.9")
			result.releaseNotes?.should.equal("Release notes")
		})
	})

	it("reports update check network failures instead of pretending the bundled version is current", async () => {
		const fetchStub = sandbox.stub().rejects(new Error("proxy required"))

		await mockFetchForTesting(fetchStub, async () => {
			const result = await checkForARSUpdate("C:\\workspace")

			result.hasUpdate.should.be.false()
			result.error?.should.equal("无法获取最新版本信息，请检查网络连接或代理设置")
			result.latestVersion.should.equal("unknown")
		})
	})
})
