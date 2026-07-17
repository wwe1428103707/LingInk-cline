import type { Dirent } from "node:fs"
import * as fsSync from "node:fs"
import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as vscode from "vscode"
import { HostProvider } from "@/hosts/host-provider"
import { fetch } from "@/shared/net"
import { Logger } from "@/shared/services/Logger"
import { BUNDLED_SKILLS_DIR, getExpectedInstalledSkillFilePaths, getInstallableBundledSkillBundles } from "./bundled-skills"

/**
 * Name of the marker file placed in the workspace skills dir after installation.
 */
const INSTALL_MARKER = ".lingink-ars-installed"

/**
 * Relative path of the skills root within the extension.
 */
const ARS_SKILLS_RELATIVE = path.join(BUNDLED_SKILLS_DIR, "lingink-ars")

/**
 * Plugin manifest filename inside the ARS bundle.
 */
const PLUGIN_MANIFEST = "_plugin-manifest.json"

/**
 * GitHub API URL to check the latest release of ARS.
 */
const ARS_GITHUB_REPO = "Imbad0202/academic-research-skills"
const GITHUB_API_LATEST_RELEASE = `https://api.github.com/repos/${ARS_GITHUB_REPO}/releases/latest`
const GITHUB_RELEASES_URL = `https://github.com/${ARS_GITHUB_REPO}/releases`

/**
 * Message shown when bundled academic skills are not installed.
 */
const INSTALL_PROMPT_MSG = "灵砚内置学术技能包未在当前工作区完整安装。是否立即安装？"

export interface UpdateCheckResult {
	hasUpdate: boolean
	currentVersion: string
	latestVersion: string
	releaseUrl: string
	releaseNotes?: string
	error?: string
}

/**
 * Read the current bundled ARS version from _plugin-manifest.json.
 */
export function getBundledVersion(): string {
	const extensionFsPath = HostProvider.get().extensionFsPath
	const manifestPath = path.join(extensionFsPath, ARS_SKILLS_RELATIVE, PLUGIN_MANIFEST)
	try {
		const raw = fsSync.readFileSync(manifestPath, "utf-8")
		const manifest = JSON.parse(raw)
		return manifest.version ?? "0.0.0"
	} catch {
		return "0.0.0"
	}
}

/**
 * Read the installed version from the marker file in the workspace.
 */
async function getInstalledVersion(workspaceRoot: string): Promise<string | null> {
	const markerPath = path.join(workspaceRoot, ".clinerules", "skills", INSTALL_MARKER)
	try {
		const raw = await fs.readFile(markerPath, "utf-8")
		const data = JSON.parse(raw)
		return data.version ?? null
	} catch {
		return null
	}
}

/**
 * Fetch the latest release version from GitHub API.
 */
const UPDATE_CHECK_ERROR = "无法获取最新版本信息，请检查网络连接或代理设置"

async function fetchLatestRelease(): Promise<{ tag_name: string; html_url: string; body?: string; error?: string }> {
	try {
		const response = await fetch(GITHUB_API_LATEST_RELEASE, {
			headers: {
				Accept: "application/vnd.github.v3+json",
				"User-Agent": "LingInk-VSCode-Extension",
			},
		})
		if (!response.ok) {
			return { tag_name: "", html_url: "", error: `${UPDATE_CHECK_ERROR} (HTTP ${response.status})` }
		}
		const data = await response.json()
		return {
			tag_name: data.tag_name ?? "",
			html_url: data.html_url ?? "",
			body: data.body ?? undefined,
		}
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : String(error)
		const errorStack = error instanceof Error ? error.stack : undefined
		Logger.warn(`[SkillInstaller] Failed to fetch latest ARS release: ${errorMsg}`, errorStack || "")
		return { tag_name: "", html_url: "", error: UPDATE_CHECK_ERROR }
	}
}

/**
 * Check whether a newer version of ARS skills is available.
 */
export async function checkForARSUpdate(workspaceRoot: string): Promise<UpdateCheckResult> {
	// Use installed version if available, fall back to bundled (static in VSIX).
	const installedVersion = await getInstalledVersion(workspaceRoot)
	const currentVersion = installedVersion ?? getBundledVersion()
	const latestInfo = await fetchLatestRelease()

	if (!latestInfo || !latestInfo.tag_name) {
		return {
			hasUpdate: false,
			currentVersion,
			latestVersion: "unknown",
			releaseUrl: GITHUB_RELEASES_URL,
			error: latestInfo?.error ?? UPDATE_CHECK_ERROR,
		}
	}

	const latestTag = latestInfo.tag_name.replace(/^v/, "")
	const hasUpdate = compareVersions(latestTag, currentVersion) > 0

	return {
		hasUpdate,
		currentVersion,
		latestVersion: latestTag,
		releaseUrl: latestInfo.html_url,
		releaseNotes: latestInfo.body,
	}
}

/**
 * Simple semver comparison. Returns >0 if a > b, 0 if equal, <0 if a < b.
 */
function compareVersions(a: string, b: string): number {
	const aParts = a.split(".").map(Number)
	const bParts = b.split(".").map(Number)
	for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
		const aNum = aParts[i] ?? 0
		const bNum = bParts[i] ?? 0
		if (aNum !== bNum) return aNum - bNum
	}
	return 0
}

/**
 * Check whether bundled academic skills are already installed in the given workspace root.
 */
export async function areSkillsInstalled(workspaceRoot: string): Promise<boolean> {
	// 1. Check for the marker file
	const markerPath = path.join(workspaceRoot, ".clinerules", "skills", INSTALL_MARKER)
	const hasMarker = await fs
		.access(markerPath)
		.then(() => true)
		.catch(() => false)

	const extensionFsPath = HostProvider.get().extensionFsPath
	const requiredSkillPaths = await getExpectedInstalledSkillFilePaths(extensionFsPath, workspaceRoot)
	if (requiredSkillPaths.length === 0) {
		return hasMarker
	}

	const allRequiredSkillsExist = (
		await Promise.all(
			requiredSkillPaths.map((skillPath) =>
				fs
					.access(skillPath)
					.then(() => true)
					.catch(() => false),
			),
		)
	).every(Boolean)

	if (hasMarker && allRequiredSkillsExist) {
		return true
	}

	if (allRequiredSkillsExist) {
		await writeInstallMarker(workspaceRoot)
		return true
	}

	// 2. Check if at least one legacy ARS skill SKILL.md exists
	const drPath = path.join(workspaceRoot, ".clinerules", "skills", "deep-research", "SKILL.md")
	try {
		await fs.access(drPath)
		if (allRequiredSkillsExist) {
			// Found a complete legacy install — write the marker and return true
			await writeInstallMarker(workspaceRoot)
			return true
		}
		return false
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
					source: "bundled-skills",
					version: getBundledVersion(),
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
 * File extensions recognized as agent config files.
 */
const AGENT_CONFIG_EXTENSIONS = new Set([".md", ".yaml", ".yml"])

/**
 * Install all bundled academic skills into the current workspace.
 * Copies from the extension's bundled directory to the workspace .clinerules/skills/.
 * Also flattens any bundled `agents/` definitions into .clinerules/agents/ so the
 * SDK configured-agent loader can surface them as subagent tools.
 */
export async function installBundledSkills(workspaceRoot: string): Promise<string> {
	const extensionFsPath = HostProvider.get().extensionFsPath
	const bundles = await getInstallableBundledSkillBundles(extensionFsPath)

	const dstDir = path.join(workspaceRoot, ".clinerules", "skills")

	// Create destination
	await fs.mkdir(dstDir, { recursive: true })

	let copied = 0
	let skipped = 0
	for (const bundle of bundles) {
		const targetDir = bundle.installMode === "copyDirectory" ? path.join(dstDir, bundle.directoryName) : dstDir
		await fs.mkdir(targetDir, { recursive: true })
		const result = await copyRecursive(bundle.sourcePath, targetDir, bundle.skipNames ?? [])
		copied += result.copied
		skipped += result.skipped
	}

	// Flatten bundled agent definitions into .clinerules/agents/ so the SDK
	// configured-agent loader discovers them as subagent tools.
	await installBundledAgentConfigs(workspaceRoot, bundles)

	// Write marker
	await writeInstallMarker(workspaceRoot)

	Logger.log(`[SkillInstaller] Installed bundled skills to ${dstDir} (${copied} copied, ${skipped} skipped)`)

	if (copied === 0) {
		throw new Error("安装过程中没有复制任何文件，请检查扩展包内容")
	}

	return dstDir
}

/**
 * Recursively scan each bundle for `agents/` directories and copy recognized
 * agent config files into `.clinerules/agents/`. Bundled copies win on name
 * collision; a warning is logged when an existing file is overwritten.
 */
async function installBundledAgentConfigs(
	workspaceRoot: string,
	bundles: Awaited<ReturnType<typeof getInstallableBundledSkillBundles>>,
): Promise<void> {
	const agentsDstDir = path.join(workspaceRoot, ".clinerules", "agents")
	await fs.mkdir(agentsDstDir, { recursive: true })

	for (const bundle of bundles) {
		const agents = await collectAgentConfigFiles(bundle.sourcePath, bundle.skipNames ?? [])
		for (const srcPath of agents) {
			const fileName = path.basename(srcPath)
			const dstPath = path.join(agentsDstDir, fileName)
			try {
				const exists = await fs
					.access(dstPath)
					.then(() => true)
					.catch(() => false)
				if (exists) {
					Logger.warn(`[SkillInstaller] Overwriting existing agent config: ${fileName}`)
				}
				await fs.copyFile(srcPath, dstPath)
			} catch (error) {
				const msg = error instanceof Error ? error.message : String(error)
				Logger.error(`[SkillInstaller] Failed to copy agent config ${srcPath}: ${msg}`)
			}
		}
	}
}

/**
 * Recursively collect agent config files from `agents/` subdirectories under `src`.
 */
async function collectAgentConfigFiles(src: string, skipNames: string[]): Promise<string[]> {
	const configs: string[] = []

	let entries: Dirent[]
	try {
		entries = await fs.readdir(src, { withFileTypes: true })
	} catch {
		return configs
	}

	for (const entry of entries) {
		if (skipNames.includes(entry.name)) {
			continue
		}

		const srcPath = path.join(src, entry.name)
		if (entry.isDirectory()) {
			if (entry.name === "agents") {
				const agentEntries = await fs.readdir(srcPath, { withFileTypes: true })
				for (const agentEntry of agentEntries) {
					if (!agentEntry.isFile()) {
						continue
					}
					const ext = path.extname(agentEntry.name).toLowerCase()
					if (AGENT_CONFIG_EXTENSIONS.has(ext)) {
						configs.push(path.join(srcPath, agentEntry.name))
					}
				}
			} else {
				const sub = await collectAgentConfigFiles(srcPath, skipNames)
				configs.push(...sub)
			}
		}
	}

	return configs
}

/**
 * Download and install the latest ARS release from GitHub.
 */
export async function downloadAndInstallUpdate(workspaceRoot: string): Promise<string> {
	// Get latest release info
	const latestInfo = await fetchLatestRelease()
	if (!latestInfo || !latestInfo.tag_name) {
		throw new Error(latestInfo?.error ?? UPDATE_CHECK_ERROR)
	}

	const tag = latestInfo.tag_name
	const downloadUrl = `https://github.com/${ARS_GITHUB_REPO}/archive/refs/tags/${tag}.tar.gz`

	Logger.log(`[SkillInstaller] Downloading ARS update ${tag} from ${downloadUrl}`)

	// Download the tarball using fetch
	const response = await fetch(downloadUrl)
	if (!response.ok) {
		throw new Error(`下载失败: HTTP ${response.status}`)
	}

	const buffer = Buffer.from(await response.arrayBuffer())

	// Extract to a temp directory using tar + gzip (Node.js built-in zlib)
	const { execSync } = await import("node:child_process")
	const tmpDir = path.join(workspaceRoot, ".clinerules", ".ars-update-tmp")

	try {
		// Clean any previous temp
		await fs.rm(tmpDir, { recursive: true, force: true })
		await fs.mkdir(tmpDir, { recursive: true })

		// Write tarball to temp
		const tarballPath = path.join(tmpDir, "release.tar.gz")
		await fs.writeFile(tarballPath, buffer)

		// Extract using tar (available on all platforms via git-bash or system)
		execSync(`tar -xzf "${tarballPath}" -C "${tmpDir}"`, { stdio: "pipe" })

		// The extracted dir name is typically academic-research-skills-{tag}
		const extractedName = `academic-research-skills-${tag.replace(/^v/, "")}`
		const extractedPath = path.join(tmpDir, extractedName)
		const skillsPath = path.join(extractedPath, "skills")

		// Verify the extracted skills directory exists; if not, try the root
		let sourceDir: string
		try {
			await fs.access(skillsPath)
			sourceDir = skillsPath
		} catch {
			// Fallback: the whole repo might be the skills directory
			sourceDir = extractedPath
		}

		const dstDir = path.join(workspaceRoot, ".clinerules", "skills")
		await fs.mkdir(dstDir, { recursive: true })

		// Copy the updated ARS files without removing other bundled skills.
		const result = await copyRecursive(sourceDir, dstDir, ["node_modules", ".git", ".github"])

		// Write marker with updated version
		const markerPath = path.join(dstDir, INSTALL_MARKER)
		await fs.writeFile(
			markerPath,
			JSON.stringify(
				{
					installedAt: new Date().toISOString(),
					source: "lingink-ars",
					version: tag.replace(/^v/, ""),
					updatedFrom: "github",
				},
				null,
				2,
			),
			"utf-8",
		)

		Logger.log(`[SkillInstaller] Updated ARS skills to ${tag} (${result.copied} files)`)

		// Cleanup temp
		await fs.rm(tmpDir, { recursive: true, force: true })

		return dstDir
	} catch (error) {
		// Cleanup on failure
		await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
		throw error
	}
}

/**
 * Recursively copy files from `src` to `dst`, excluding paths in `skipNames`.
 */
async function copyRecursive(src: string, dst: string, skipNames: string[] = []): Promise<{ copied: number; skipped: number }> {
	let copied = 0
	let skipped = 0

	const entries = await fs.readdir(src, { withFileTypes: true })
	for (const entry of entries) {
		if (skipNames.includes(entry.name)) {
			skipped++
			continue
		}

		const srcPath = path.join(src, entry.name)
		const dstPath = path.join(dst, entry.name)

		if (entry.isDirectory()) {
			await fs.mkdir(dstPath, { recursive: true })
			const sub = await copyRecursive(srcPath, dstPath, skipNames)
			copied += sub.copied
			skipped += sub.skipped
		} else if (entry.isFile()) {
			await fs.copyFile(srcPath, dstPath)
			copied++
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
		"📥 安装内置学术技能",
		"📖 了解更多",
	)

	if (action === "📥 安装内置学术技能") {
		try {
			const dstDir = await installBundledSkills(workspaceRoot)
			const fileCount = countFiles(dstDir)
			const countMsg = fileCount > 0 ? `共 ${fileCount} 个文件` : "文件已安装"
			vscode.window.showInformationMessage(`✅ 内置学术技能已安装到工作区！${countMsg}\n重启 LingInk 会话后即可使用。`)
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error)
			Logger.error(`[SkillInstaller] Installation failed: ${msg}`)
			vscode.window.showErrorMessage(`❌ 安装失败: ${msg}`)
		}
	} else if (action === "📖 了解更多") {
		vscode.env.openExternal(vscode.Uri.parse(GITHUB_RELEASES_URL))
	}
}

/**
 * Check for ARS updates and prompt the user.
 */
export async function checkAndPromptARSUpdate(): Promise<void> {
	const wsFolders = vscode.workspace.workspaceFolders
	if (!wsFolders || wsFolders.length === 0) return

	const workspaceRoot = wsFolders[0].uri.fsPath
	if (!workspaceRoot) return

	const result = await checkForARSUpdate(workspaceRoot)
	if (result.error) {
		vscode.window.showWarningMessage(`⚠️ 学术研究技能包更新检查失败: ${result.error}`, { modal: false })
		return
	}

	if (!result.hasUpdate) {
		vscode.window.showInformationMessage(`✅ 学术研究技能包已是最新版本 (v${result.currentVersion})`, { modal: false })
		return
	}

	const action = await vscode.window.showInformationMessage(
		`📦 学术研究技能包有新版本可用: v${result.currentVersion} → v${result.latestVersion}\n${result.releaseNotes ? `${result.releaseNotes.slice(0, 200)}…` : ""}`,
		{ modal: false },
		"⬆️ 立即升级",
		"📖 查看发布说明",
	)

	if (action === "⬆️ 立即升级") {
		try {
			await downloadAndInstallUpdate(workspaceRoot)
			vscode.window.showInformationMessage(`✅ 学术研究技能包已升级到 v${result.latestVersion}！重启 LingInk 会话后生效。`)
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error)
			Logger.error(`[SkillInstaller] Update failed: ${msg}`)
			vscode.window.showErrorMessage(`❌ 升级失败: ${msg}`)
		}
	} else if (action === "📖 查看发布说明") {
		vscode.env.openExternal(vscode.Uri.parse(result.releaseUrl))
	}
}

/**
 * Count files recursively for user feedback.
 * Returns -1 if the directory doesn't exist or can't be read.
 */
function countFiles(dir: string): number {
	try {
		let count = 0
		const walk = (d: string): void => {
			const entries = fsSync.readdirSync(d, { withFileTypes: true })
			for (const entry of entries) {
				const p = path.join(d, entry.name)
				if (entry.isDirectory()) {
					walk(p)
				} else if (entry.isFile()) {
					count++
				}
			}
		}
		walk(dir)
		return count
	} catch {
		return -1
	}
}
