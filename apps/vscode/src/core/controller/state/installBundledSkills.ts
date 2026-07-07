import * as fs from "node:fs/promises"
import * as path from "node:path"
import { Empty, EmptyRequest } from "@shared/proto/cline/common"
import { ShowMessageType } from "@shared/proto/host/window"
import { HostProvider } from "@/hosts/host-provider"
import { areSkillsInstalled, installBundledSkills as installBundledSkillsFromService } from "@/services/skill-installer"
import { Logger } from "@/shared/services/Logger"
import { Controller } from ".."

/**
 * Installs bundled Academic Research Skills into the current workspace.
 * Called from the Settings page in the webview.
 */
export async function installBundledSkills(_controller: Controller, _request: EmptyRequest): Promise<Empty> {
	try {
		const { paths } = await HostProvider.workspace.getWorkspacePaths({})
		const workspaceRoot = paths?.[0]
		if (!workspaceRoot) {
			throw new Error("No workspace folder open")
		}

		// Check if already installed
		const alreadyInstalled = await areSkillsInstalled(workspaceRoot)
		if (alreadyInstalled) {
			// Fire-and-forget: return immediately, don't block gRPC response
			HostProvider.window
				.showMessage({
					type: ShowMessageType.INFORMATION,
					message: "学术研究技能包已安装。如需重新安装，请先删除工作区中的 .clinerules/skills/ 目录。",
					options: { items: [] },
				})
				.catch(() => {})
			return Empty.create()
		}

		const dstDir = await installBundledSkillsFromService(workspaceRoot)

		// Count installed files for user feedback
		let fileCount = 0
		const walk = async (d: string): Promise<void> => {
			const entries = await fs.readdir(d, { withFileTypes: true })
			for (const e of entries) {
				const p = path.join(d, e.name)
				if (e.isDirectory()) {
					await walk(p)
				} else if (e.isFile()) {
					fileCount++
				}
			}
		}
		await walk(dstDir)

		// Fire-and-forget: return immediately, don't block gRPC response
		HostProvider.window
			.showMessage({
				type: ShowMessageType.INFORMATION,
				message: `✅ 学术研究技能包已安装到工作区！共 ${fileCount} 个文件。重启 LingInk 会话后即可使用。`,
				options: { items: [] },
			})
			.catch(() => {})

		Logger.log(`[installBundledSkills] Installed ${fileCount} files to ${dstDir}`)
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error)
		Logger.error("[installBundledSkills] Failed:", error)
		// Fire-and-forget: return immediately, don't block gRPC response
		HostProvider.window
			.showMessage({
				type: ShowMessageType.ERROR,
				message: `❌ 安装学术研究技能包失败: ${msg}`,
				options: { items: [] },
			})
			.catch(() => {})
	}

	return Empty.create()
}
