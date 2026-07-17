import { afterEach, beforeEach, describe, it } from "bun:test"
import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import "should"
import sinon from "sinon"
import * as tar from "tar"
import { HostProvider } from "@/hosts/host-provider"
import { type FetchFunction, mockFetchForTesting } from "@/shared/net"
import { areSkillsInstalled, checkForARSUpdate, downloadAndInstallUpdate, installBundledSkills } from "../skill-installer"

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
		const responseBody = JSON.stringify({
			tag_name: "v9.9.9",
			html_url: "https://github.com/Imbad0202/academic-research-skills/releases/tag/v9.9.9",
			body: "Release notes",
		})
		const fetchStub = sandbox.stub().resolves({
			ok: true,
			text: async () => responseBody,
			json: async () => JSON.parse(responseBody),
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

	it("includes HTTP status details when the GitHub API returns an error", async () => {
		const fetchStub = sandbox.stub().resolves({
			ok: false,
			status: 403,
			statusText: "rate limit",
			text: async () => JSON.stringify({ message: "API rate limit exceeded" }),
		})

		await mockFetchForTesting(fetchStub, async () => {
			const result = await checkForARSUpdate("C:\\workspace")

			result.hasUpdate.should.be.false()
			result.error?.should.containEql("403")
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

	it("downloads and installs the latest ARS release from a GitHub tarball", async () => {
		const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "lingink-workspace-"))
		tempDirs.push(workspaceRoot)

		const tarball = await buildTestTarball("9.9.9")
		const releaseBody = JSON.stringify({
			tag_name: "v9.9.9",
			html_url: "https://github.com/Imbad0202/academic-research-skills/releases/tag/v9.9.9",
			body: "Release notes",
		})

		const fetchStub = sandbox.stub().callsFake(async (url: string | URL | Request) => {
			const urlString = String(url)
			if (urlString.includes("api.github.com")) {
				return {
					ok: true,
					text: async () => releaseBody,
					json: async () => JSON.parse(releaseBody),
				}
			}
			return {
				ok: true,
				headers: { get: () => String(tarball.length) },
				arrayBuffer: async () => tarball.buffer.slice(tarball.byteOffset, tarball.byteOffset + tarball.byteLength),
			}
		})

		await mockFetchForTesting(fetchStub as unknown as FetchFunction, async () => {
			const dstDir = await downloadAndInstallUpdate(workspaceRoot)

			dstDir.should.equal(path.join(workspaceRoot, ".clinerules", "skills"))
			await fs.access(path.join(dstDir, "deep-research", "SKILL.md"))
			await fs.access(path.join(dstDir, "shared", "handoff_schemas.md"))
			;(await areSkillsInstalled(workspaceRoot)).should.be.true()
		})
	})
})

async function writeSkill(skillDir: string, name: string): Promise<void> {
	await fs.mkdir(skillDir, { recursive: true })
	await fs.writeFile(
		path.join(skillDir, "SKILL.md"),
		`---\nname: ${name}\ndescription: test skill\n---\n\n# ${name}\n\nTest instructions.`,
	)
}

async function buildTestTarball(version: string): Promise<Buffer> {
	const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "lingink-tarball-"))
	const repoName = `academic-research-skills-${version}`
	const repoRoot = path.join(tmpDir, repoName)

	await fs.mkdir(path.join(repoRoot, "deep-research"), { recursive: true })
	await fs.mkdir(path.join(repoRoot, "shared"), { recursive: true })
	await fs.writeFile(
		path.join(repoRoot, "deep-research", "SKILL.md"),
		`---\nname: deep-research\ndescription: test\n---\n\n# Deep Research\n\nTest.`,
	)
	await fs.writeFile(path.join(repoRoot, "shared", "handoff_schemas.md"), "# Handoff schemas\n")

	const tarballPath = path.join(tmpDir, "release.tar.gz")
	await tar.create(
		{
			gzip: true,
			file: tarballPath,
			cwd: tmpDir,
		},
		[repoName],
	)

	const buffer = Buffer.from(await fs.readFile(tarballPath))
	await fs.rm(tmpDir, { recursive: true, force: true })
	return buffer
}

function expectErrorCode(error: unknown, code: string): void {
	String((error as NodeJS.ErrnoException).code).should.equal(code)
}
