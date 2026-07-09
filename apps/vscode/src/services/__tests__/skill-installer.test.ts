import { afterEach, beforeEach, describe, it } from "bun:test"
import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import "should"
import sinon from "sinon"
import { HostProvider } from "@/hosts/host-provider"
import { mockFetchForTesting } from "@/shared/net"
import { areSkillsInstalled, checkForARSUpdate, installBundledSkills } from "../skill-installer"

describe("skill-installer ARS updates", () => {
	let sandbox: sinon.SinonSandbox
	let hostGetStub: sinon.SinonStub
	let tempDirs: string[]

	beforeEach(() => {
		sandbox = sinon.createSandbox()
		hostGetStub = sandbox
			.stub(HostProvider, "get")
			.returns({ extensionFsPath: "C:\\missing-extension-dir" } as ReturnType<typeof HostProvider.get>)
		tempDirs = []
	})

	afterEach(async () => {
		sandbox.restore()
		await Promise.all(tempDirs.map((dir) => fs.rm(dir, { recursive: true, force: true })))
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

	it("installs every bundled skill directory without flattening single-skill roots", async () => {
		const extensionRoot = await fs.mkdtemp(path.join(os.tmpdir(), "lingink-extension-"))
		const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "lingink-workspace-"))
		tempDirs.push(extensionRoot, workspaceRoot)
		hostGetStub.returns({ extensionFsPath: extensionRoot } as ReturnType<typeof HostProvider.get>)

		await writeSkill(path.join(extensionRoot, "bundled-skills", "lingink-ars", "deep-research"), "deep-research")
		await fs.writeFile(path.join(extensionRoot, "bundled-skills", "lingink-ars", "plugin.js"), "")
		await fs.writeFile(
			path.join(extensionRoot, "bundled-skills", "lingink-ars", "_plugin-manifest.json"),
			JSON.stringify({ version: "3.13.0" }),
		)
		await writeSkill(path.join(extensionRoot, "bundled-skills", "polish-skills", "humanizer"), "humanizer")
		await writeSkill(path.join(extensionRoot, "bundled-skills", "scientific-toolkit-skill"), "scientific-toolkit-skill")
		await writeSkill(path.join(extensionRoot, "bundled-skills", "office-academic-skill"), "office-academic-skill")
		await writeSkill(path.join(extensionRoot, "bundled-skills", "future-single-skill"), "future-single-skill")
		await writeSkill(
			path.join(extensionRoot, "bundled-skills", "future-container-skills", "future-child-skill"),
			"future-child-skill",
		)

		const destination = await installBundledSkills(workspaceRoot)

		await fs.access(path.join(destination, "deep-research", "SKILL.md"))
		await fs.access(path.join(destination, "humanizer", "SKILL.md"))
		await fs.access(path.join(destination, "scientific-toolkit-skill", "SKILL.md"))
		await fs.access(path.join(destination, "office-academic-skill", "SKILL.md"))
		await fs.access(path.join(destination, "future-single-skill", "SKILL.md"))
		await fs.access(path.join(destination, "future-child-skill", "SKILL.md"))
		await fs
			.access(path.join(destination, "SKILL.md"))
			.then(() => {
				throw new Error("single-skill bundles should be installed into named subdirectories")
			})
			.catch((error) => {
				expectErrorCode(error, "ENOENT")
			})
		await fs
			.access(path.join(destination, "plugin.js"))
			.then(() => {
				throw new Error("ARS plugin runtime file should not be copied into workspace skills")
			})
			.catch((error) => {
				expectErrorCode(error, "ENOENT")
			})
		;(await areSkillsInstalled(workspaceRoot)).should.be.true()
	})
})

async function writeSkill(skillDir: string, name: string): Promise<void> {
	await fs.mkdir(skillDir, { recursive: true })
	await fs.writeFile(
		path.join(skillDir, "SKILL.md"),
		`---\nname: ${name}\ndescription: test skill\n---\n\n# ${name}\n\nTest instructions.`,
	)
}

function expectErrorCode(error: unknown, code: string): void {
	String((error as NodeJS.ErrnoException).code).should.equal(code)
}
