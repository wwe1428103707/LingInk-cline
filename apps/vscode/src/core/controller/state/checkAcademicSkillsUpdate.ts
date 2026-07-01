import { Empty, EmptyRequest } from "@shared/proto/cline/common"
import type { AcademicSkillsUpdateInfo } from "@shared/proto/cline/state"
import { HostProvider } from "@/hosts/host-provider"
import { Logger } from "@/shared/services/Logger"
import { checkForARSUpdate, downloadAndInstallUpdate } from "@/services/skill-installer"
import { Controller } from ".."

/**
 * Check whether a newer version of ARS skills is available from GitHub.
 */
export async function checkAcademicSkillsUpdate(
	_controller: Controller,
	_request: EmptyRequest,
): Promise<AcademicSkillsUpdateInfo> {
	try {
		const { paths } = await HostProvider.workspace.getWorkspacePaths({})
		const workspaceRoot = paths?.[0]
		if (!workspaceRoot) {
			return {
				hasUpdate: false,
				currentVersion: "unknown",
				latestVersion: "unknown",
				releaseUrl: "",
			}
		}

		const result = await checkForARSUpdate(workspaceRoot)
		return {
			hasUpdate: result.hasUpdate,
			currentVersion: result.currentVersion,
			latestVersion: result.latestVersion,
			releaseUrl: result.releaseUrl,
			releaseNotes: result.releaseNotes,
		}
	} catch (error) {
		Logger.error("[checkAcademicSkillsUpdate] Failed:", error)
		return {
			hasUpdate: false,
			currentVersion: "unknown",
			latestVersion: "unknown",
			releaseUrl: "",
		}
	}
}

/**
 * Download and install the latest ARS release from GitHub.
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
