import { describe, it } from "bun:test"
import "should"
import path from "node:path"

const manifestPath = path.resolve(import.meta.dir, "..", "..", "package.json")

async function readManifest(): Promise<any> {
	return JSON.parse(await Bun.file(manifestPath).text())
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
})
