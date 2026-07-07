import { describe, it } from "bun:test"
import "should"
import path from "node:path"

const manifestPath = path.resolve(import.meta.dir, "..", "..", "package.json")

async function readManifest(): Promise<any> {
	return JSON.parse(await Bun.file(manifestPath).text())
}

describe("VS Code package manifest", () => {
	it("contributes a LingInk webview to the auxiliary side bar", async () => {
		const manifest = await readManifest()

		manifest.engines.vscode.should.equal("^1.104.0")

		const auxiliaryContainers = manifest.contributes.viewsContainers.secondarySidebar
		auxiliaryContainers.should.be.an.Array()
		auxiliaryContainers.should.containDeep([
			{
				id: "claude-dev-ActivityBar",
				title: "%activitybar.title%",
				icon: "assets/icons/icon.png",
			},
		])

		const auxiliaryViews = manifest.contributes.views["claude-dev-ActivityBar"]
		auxiliaryViews.should.be.an.Array()
		auxiliaryViews.should.containDeep([
			{
				type: "webview",
				id: "claude-dev.SidebarProvider",
				name: "",
				icon: "assets/icons/icon.png",
			},
		])
	})
})
