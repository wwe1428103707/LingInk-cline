import { describe, it } from "bun:test"
import "should"
import path from "node:path"

const manifestPath = path.resolve(import.meta.dir, "..", "..", "package.json")
const nlsPath = path.resolve(import.meta.dir, "..", "..", "package.nls.json")
const zhNlsPath = path.resolve(import.meta.dir, "..", "..", "package.nls.zh-cn.json")
const extensionPath = path.resolve(import.meta.dir, "..", "extension.ts")
const registryPath = path.resolve(import.meta.dir, "..", "registry.ts")

interface PackageManifest {
	contributes: {
		commands: Array<{ command: string }>
		views: Record<string, unknown[]>
		viewsContainers: {
			activitybar: unknown[]
			secondarySidebar: unknown[]
		}
	}
	engines: {
		vscode: string
	}
}

async function readManifest(): Promise<PackageManifest> {
	return JSON.parse(await Bun.file(manifestPath).text())
}

async function readNls(filePath: string): Promise<Record<string, string>> {
	return JSON.parse(await Bun.file(filePath).text())
}

describe("VS Code package manifest", () => {
	it("contributes LingInk webviews to the activity bar and auxiliary side bar", async () => {
		const manifest = await readManifest()

		manifest.engines.vscode.should.equal("^1.104.0")

		const activityBarContainers = manifest.contributes.viewsContainers.activitybar
		activityBarContainers.should.be.an.Array()
		activityBarContainers.should.containDeep([
			{
				id: "claude-dev-ActivityBar",
				title: "%activitybar.title%",
				icon: "assets/icons/icon.svg",
			},
		])

		const auxiliaryContainers = manifest.contributes.viewsContainers.secondarySidebar
		auxiliaryContainers.should.be.an.Array()
		auxiliaryContainers.should.containDeep([
			{
				id: "claude-dev-SecondarySidebar",
				title: "%activitybar.title%",
				icon: "assets/icons/icon.svg",
			},
		])

		const activityBarViews = manifest.contributes.views["claude-dev-ActivityBar"]
		activityBarViews.should.be.an.Array()
		activityBarViews.should.containDeep([
			{
				type: "webview",
				id: "claude-dev.SidebarProvider",
				name: "",
				icon: "assets/icons/icon.svg",
			},
		])

		const auxiliaryViews = manifest.contributes.views["claude-dev-SecondarySidebar"]
		auxiliaryViews.should.be.an.Array()
		auxiliaryViews.should.containDeep([
			{
				type: "webview",
				id: "claude-dev.SecondarySidebarProvider",
				name: "",
				icon: "assets/icons/icon.svg",
			},
		])
	})

	it("keeps shortcut command contributions synchronized with registry and activation handlers", async () => {
		const manifest = await readManifest()
		const enNls = await readNls(nlsPath)
		const zhNls = await readNls(zhNlsPath)
		const registrySource = await Bun.file(registryPath).text()
		const extensionSource = await Bun.file(extensionPath).text()
		const commandIds = manifest.contributes.commands.map((command: { command: string }) => command.command)

		for (const shortcut of [
			{ id: "cline.polishText", registryKey: "PolishText" },
			{ id: "cline.experimentAssistant", registryKey: "ExperimentAssistant" },
			{ id: "cline.officeAcademicAssistant", registryKey: "OfficeAcademicAssistant" },
		]) {
			commandIds.should.containEql(shortcut.id)
			enNls.should.have.property(`command.${shortcut.id}`)
			zhNls.should.have.property(`command.${shortcut.id}`)
			registrySource.should.containEql(`${shortcut.registryKey}: prefix + ".${shortcut.id.replace("cline.", "")}"`)
			extensionSource.should.containEql(`registerCommand(commands.${shortcut.registryKey}`)
		}
	})
})
