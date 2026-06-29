import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as vscode from "vscode"
import { HostProvider } from "@/hosts/host-provider"
import { Logger } from "@/shared/services/Logger"

/**
 * Name of the marker file placed in the workspace skills dir after installation.
 */
const INSTALL_MARKER = ".lingink-ars-installed"

/**
 * Name of the bundled skills directory inside the extension.
 */
const BUNDLED_SKILLS_DIR = "bundled-skills"

/**
 * Relative path of the skills root within the extension.
 */
const ARS_SKILLS_RELATIVE = path.join(BUNDLED_SKILLS_DIR, "lingink-ars")

/**
 * Message shown when ARS skills are not installed.
 */
const INSTALL_PROMPT_MSG =
	"灵砚学术研究技能包 (Academic Research Skills) 未在当前工作区安装。是否立即安装？"

/**
 * Check whether ARS skills are already installed in the given workspace root.
 */
export async function areSkillsInstalled(workspaceRoot: string): Promise<boolean> {
	// 1. Check for the marker file
	const markerPath = path.join(workspaceRoot, ".clinerules", "skills", INSTALL_MARKER)
	try {
		await fs.access(markerPath)
		return true
	} catch {
		// marker not found, continue checking
	}

	// 2. Check if at least one ARS skill SKILL.md exists
	const drPath = path.join(workspaceRoot, ".clinerules", "skills", "deep-research", "SKILL.md")
	try {
		await fs.access(drPath)
		// Found a skill — write the marker and return true
		await writeInstallMarker(workspaceRoot)
		return true
	} catch {
		return false
	}
}

/**
 * Write the installation marker file to the workspace skills directory.
 */
async function writeInstallMarker(workspaceRoot: string): Promise<void> {
	const markerPath = path.join(workspaceRoot, ".clinerules", "skills", INSTALL_MARKER)
	try {
		await fs.writeFile(
			markerPath,
			JSON.stringify(
				{
					installedAt: new Date().toISOString(),
					source: "lingink-ars",
					version: "3.13.0",
				},
				null,
				2,
			),
			"utf-8",
		)
	} catch {
		// Non-critical — skills still work without the marker
	}
}

/**
 * Install bundled ARS skills into the current workspace.
 *
 * 1. Resolves the extension's bundled skills directory.
 * 2. Creates `.clinerules/skills/` in the workspace root.
 * 3. Copies all bundled content (skills, agents, shared, scripts, etc.).
 * 4. Writes a marker file.
 *
 * @returns The target directory path on success, or throws.
 */
export async function installBundledSkills(workspaceRoot: string): Promise<string> {
	const extensionFsPath = HostProvider.get().extensionFsPath
	const srcDir = path.join(extensionFsPath, ARS_SKILLS_RELATIVE)

	// Verify source exists
	try {
		await fs.access(srcDir)
	} catch {
		throw new Error(`Bundled ARS skills not found at: ${srcDir}`)
	}

	const dstDir = path.join(workspaceRoot, ".clinerules", "skills")

	// Create destination
	await fs.mkdir(dstDir, { recursive: true })

	// Copy bundled skills recursively
	const result = await copyRecursive(srcDir, dstDir, [
		// Skip the plugin entry and its TypeScript variant — they are only needed
		// for Cline's plugin-runtime discovery, not for the workspace skills dir.
		"plugin.js",
		"plugin.ts",
		"skills", // skip the junction dir inside the bundle (would be circular)
	])

	// Write marker
	await writeInstallMarker(workspaceRoot)

	Logger.log(`[SkillInstaller] Installed ARS skills to ${dstDir} (${result.copied} copied, ${result.skipped} skipped)`)

	if (result.copied === 0) {
		throw new Error("安装过程中没有复制任何文件，请检查扩展包内容")
	}

	return dstDir
}

/**
 * Recursively copy files from `src` to `dst`, excluding paths in `skipNames`.
 */
async function copyRecursive(src: string, dst: string, skipNames: string[] = []): Promise<{ copied: number; skipped: number }> {
	const entries = await fs.readdir(src, { withFileTypes: true })
	let copied = 0
	let skipped = 0
	for (const entry of entries) {
		if (skipNames.includes(entry.name)) {
			skipped++
			continue
		}
		const srcPath = path.join(src, entry.name)
		const dstPath = path.join(dst, entry.name)
		if (entry.isDirectory()) {
			// Check if it's a symbolic link or directory junction — skip those
			const stat = await fs.lstat(srcPath)
			if (stat.isSymbolicLink() || stat.isDirectory() === false) {
				Logger.log(`[SkillInstaller] Skipping non-regular directory: ${entry.name}`)
				skipped++
				continue
			}
			await fs.mkdir(dstPath, { recursive: true })
			const result = await copyRecursive(srcPath, dstPath, skipNames)
			copied += result.copied
			skipped += result.skipped
		} else {
			try {
				await fs.copyFile(srcPath, dstPath)
				copied++
			} catch (error) {
				Logger.warn(`[SkillInstaller] Failed to copy ${entry.name}:`, error)
				skipped++
			}
		}
	}
	return { copied, skipped }
}

// ── VS Code UI integration ──────────────────────────────────────────────

/**
 * Command ID registered in package.json for manually installing ARS skills.
 */
export const INSTALL_SKILLS_COMMAND = "lingink.installAcademicSkills"

/**
 * Check the current workspace and prompt the user to install ARS skills if
 * they are missing. Called during extension activation.
 */
export async function checkAndPromptSkillInstall(): Promise<void> {
	const wsFolders = vscode.workspace.workspaceFolders
	if (!wsFolders || wsFolders.length === 0) {
		return // No workspace open — nothing to install into
	}

	const workspaceRoot = wsFolders[0].uri.fsPath
	if (!workspaceRoot) {
		return
	}

	try {
		const installed = await areSkillsInstalled(workspaceRoot)
		if (installed) {
			Logger.log("[SkillInstaller] ARS skills already installed, skipping prompt")
			return
		}
	} catch {
		// If check fails, proceed to prompt
	}

	Logger.log("[SkillInstaller] ARS skills not found, prompting user")

	const action = await vscode.window.showInformationMessage(
		INSTALL_PROMPT_MSG,
		{ modal: false },
		"📥 安装学术研究技能包",
		"📖 了解更多",
	)

	if (action === "📥 安装学术研究技能包") {
		try {
			const dstDir = await installBundledSkills(workspaceRoot)
			const fileCount = countFiles(dstDir)
			const countMsg = fileCount > 0
				? `共 ${fileCount} 个文件`
				: "文件已安装"
			vscode.window.showInformationMessage(
				`✅ 学术研究技能包已安装到工作区！${countMsg}\n重启 Cline 会话后即可使用。`,
			)
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error)
			Logger.error(`[SkillInstaller] Installation failed: ${msg}`)
			vscode.window.showErrorMessage(`❌ 安装失败: ${msg}`)
		}
	} else if (action === "📖 了解更多") {
		vscode.env.openExternal(
			vscode.Uri.parse("https://github.com/Imbad0202/academic-research-skills"),
		)
	}
}

/**
 * Count files recursively for user feedback.
 * Returns -1 if the directory doesn't exist or can't be read.
 */
function countFiles(dir: string): number {
	try {
		if (!fs.existsSync(dir)) {
			return -1
		}
		let count = 0
		const walk = (d: string): void => {
			const entries = fs.readdirSync(d, { withFileTypes: true })
			for (const e of entries) {
				const p = path.join(d, e.name)
				if (e.isDirectory()) {
					// Skip reparse points (junctions/symlinks) to avoid double-counting
					try {
						const stat = fs.lstatSync(p)
						if (stat.isSymbolicLink()) continue
					} catch {
						continue
					}
					walk(p)
				} else if (e.isFile()) {
					count++
				}
			}
		}
		walk(dir)
		return count
	} catch (error) {
		Logger.warn(`[SkillInstaller] countFiles failed for ${dir}:`, error)
		return -1
	}
}
