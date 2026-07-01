import { Empty, EmptyRequest } from "@shared/proto/cline/common"
import { HostProvider } from "@/hosts/host-provider"
import { Logger } from "@/shared/services/Logger"
import { downloadAndInstallUpdate } from "@/services/skill-installer"
import { Controller } from ".."

/**
 * Download and install the latest ARS release from GitHub.
 * Called from the Settings page in the webview.
 */
export async function updateAcademicSkills(_controller: Controller, _request: EmptyRequest): Promise<Empty> {
	try {
		const { paths } = await HostProvider.workspace.getWorkspacePaths({})
		const workspaceRoot = paths?.[0]
		if (!workspaceRoot) {
			throw new Error("No workspace folder open")
		}

		const dstDir = await downloadAndInstallUpdate(workspaceRoot)

		Logger.log(`[updateAcademicSkills] Updated ARS skills in ${dstDir}`)
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error)
		Logger.error("[updateAcademicSkills] Failed:", error)
		throw error
	}

	return Empty.create()
}
