import type { Dirent } from "node:fs"
import * as fsSync from "node:fs"
import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as tar from "tar"
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

/**
 * Human-readable base message for network/update check failures.
 */
const UPDATE_CHECK_ERROR = "无法获取最新版本信息，请检查网络连接或代理设置"

/**
 * Structured error carrying both a user-facing message and technical detail.
 */
class ARSUpdateError extends Error {
	constructor(
		message: string,
		public readonly step: "check" | "download" | "extract" | "install" | "unknown",
		public readonly detail?: string,
	) {
		super(message)
		this.name = "ARSUpdateError"
	}
}

interface ReleaseInfo {
	tag: string
	version: string
	releaseUrl: string
	downloadUrl: string
	releaseNotes?: string
	publishedAt?: string
}

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
 * Retry a function with exponential backoff for transient failures.
 */
async function withRetry<T>(label: string, fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
	let lastError: unknown
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			return await fn()
		} catch (error) {
			lastError = error
			const msg = error instanceof Error ? error.message : String(error)
			Logger.warn(`[SkillInstaller] ${label} failed (attempt ${attempt}/${maxAttempts}): ${msg}`)
			if (attempt < maxAttempts) {
				// Exponential backoff: 500ms, 1000ms, ...
				await new Promise((resolve) => setTimeout(resolve, 500 * attempt))
			}
		}
	}
	throw lastError
}

/**
 * Build a helpful, localized message from a GitHub HTTP error.
 */
function githubHttpErrorMessage(status: number, statusText: string, body?: string): string {
	if (status === 403) {
		return `${UPDATE_CHECK_ERROR}（HTTP 403，可能是 GitHub API 速率限制；可尝试配置代理或稍后重试）`
	}
	if (status === 404) {
		return `${UPDATE_CHECK_ERROR}（HTTP 404，release 不存在或仓库已迁移）`
	}
	const detail = body ? `，响应：${body.slice(0, 200)}` : ""
	return `${UPDATE_CHECK_ERROR}（HTTP ${status} ${statusText}${detail}）`
}

/**
 * Fetch the latest release metadata from the GitHub API.
 */
async function fetchLatestReleaseInfo(): Promise<ReleaseInfo> {
	const release = await withRetry("Fetch ARS release metadata", async () => {
		const response = await fetch(GITHUB_API_LATEST_RELEASE, {
			headers: {
				Accept: "application/vnd.github.v3+json",
				"User-Agent": "LingInk-VSCode-Extension",
			},
		})

		const text = await response.text()
		if (!response.ok) {
			throw new ARSUpdateError(
				githubHttpErrorMessage(response.status, response.statusText, text),
				"check",
				`GitHub API ${GITHUB_API_LATEST_RELEASE} returned HTTP ${response.status}: ${text.slice(0, 500)}`,
			)
		}

		try {
			return JSON.parse(text)
		} catch (parseError) {
			throw new ARSUpdateError(
				`${UPDATE_CHECK_ERROR}（无法解析 GitHub 响应）`,
				"check",
				`JSON parse failed for ${GITHUB_API_LATEST_RELEASE}: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
			)
		}
	})

	const tag = release.tag_name ?? ""
	if (!tag) {
		throw new ARSUpdateError(
			`${UPDATE_CHECK_ERROR}（GitHub 响应缺少 tag_name）`,
			"check",
			`Response from ${GITHUB_API_LATEST_RELEASE} contained no tag_name`,
		)
	}

	// Prefer the source tarball asset if listed; otherwise fall back to the
	// well-known GitHub archive URL.
	const sourceAsset = release.assets?.find(
		(asset: { content_type?: string; name?: string }) =>
			asset.content_type === "application/gzip" || asset.name?.endsWith(".tar.gz"),
	)
	const downloadUrl =
		sourceAsset?.browser_download_url ?? `https://github.com/${ARS_GITHUB_REPO}/archive/refs/tags/${tag}.tar.gz`

	return {
		tag,
		version: tag.replace(/^v/, ""),
		releaseUrl: release.html_url ?? GITHUB_RELEASES_URL,
		downloadUrl,
		releaseNotes: release.body ?? undefined,
		publishedAt: release.published_at ?? undefined,
	}
}

/**
 * Download the release tarball to a buffer with retry and detailed diagnostics.
 */
async function downloadReleaseTarball(url: string): Promise<Buffer> {
	return withRetry("Download ARS release tarball", async () => {
		const response = await fetch(url)
		if (!response.ok) {
			throw new ARSUpdateError(
				`下载失败：HTTP ${response.status} ${response.statusText}`,
				"download",
				`GET ${url} returned HTTP ${response.status}`,
			)
		}

		const contentLength = response.headers.get("content-length")
		const arrayBuffer = await response.arrayBuffer()
		const buffer = Buffer.from(arrayBuffer)
		Logger.log(
			`[SkillInstaller] Downloaded ${buffer.length} bytes${contentLength ? ` (expected ${contentLength})` : ""} from ${url}`,
		)
		if (buffer.length === 0) {
			throw new ARSUpdateError("下载失败：release 压缩包为空", "download", `GET ${url} returned empty body`)
		}
		return buffer
	})
}

/**
 * Check whether a newer version of ARS skills is available.
 */
export async function checkForARSUpdate(workspaceRoot: string): Promise<UpdateCheckResult> {
	// Use installed version if available, fall back to bundled (static in VSIX).
	const installedVersion = await getInstalledVersion(workspaceRoot)
	const currentVersion = installedVersion ?? getBundledVersion()

	try {
		const release = await fetchLatestReleaseInfo()
		const hasUpdate = compareVersions(release.version, currentVersion) > 0

		return {
			hasUpdate,
			currentVersion,
			latestVersion: release.version,
			releaseUrl: release.releaseUrl,
			releaseNotes: release.releaseNotes,
		}
	} catch (error) {
		const userMsg = error instanceof ARSUpdateError ? error.message : UPDATE_CHECK_ERROR
		const detail = error instanceof ARSUpdateError ? error.detail : error instanceof Error ? error.message : String(error)
		Logger.error(`[SkillInstaller] Update check failed: ${detail}`)
		return {
			hasUpdate: false,
			currentVersion,
			latestVersion: "unknown",
			releaseUrl: GITHUB_RELEASES_URL,
			error: userMsg,
		}
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
 * The four ARS skill directories that must be installed into the workspace.
 */
const ARS_SKILL_NAMES = ["deep-research", "academic-paper", "academic-paper-reviewer", "academic-pipeline"]

/**
 * Top-level support directories that must also be copied from a release.
 */
const ARS_SUPPORT_DIRS = ["shared", "scripts", "commands", "agents", "hooks"]

/**
 * Top-level files and directories in an extracted release that should never be
 * copied into the workspace skills directory.
 */
const ARS_RELEASE_SKIP_NAMES = new Set([
	"node_modules",
	".git",
	".github",
	".claude",
	".claude-plugin",
	"docs",
	"evals",
	"examples",
	"tests",
	"audits",
	"tools",
	"skills",
])

/**
 * Locate the directory inside an extracted release that contains the ARS
 * skills. The upstream repo may place skills at the repo root or under a
 * `skills/` subdirectory.
 */
async function findExtractedSkillsRoot(extractedRoot: string): Promise<string> {
	const candidates = [path.join(extractedRoot, "skills"), extractedRoot]
	for (const candidate of candidates) {
		try {
			const entries = await fs.readdir(candidate)
			const hasSkill = entries.some((name) => ARS_SKILL_NAMES.includes(name))
			if (hasSkill) {
				return candidate
			}
		} catch {
			// Candidate doesn't exist or isn't readable — try the next one.
		}
	}
	throw new ARSUpdateError(
		"解压后的 release 中未找到 ARS skills 目录",
		"extract",
		`Neither ${path.join(extractedRoot, "skills")} nor ${extractedRoot} contains expected skill directories`,
	)
}

/**
 * Download and install the latest ARS release from GitHub.
 */
export async function downloadAndInstallUpdate(workspaceRoot: string): Promise<string> {
	const tmpDir = path.join(workspaceRoot, ".clinerules", ".ars-update-tmp")

	try {
		// 1. Resolve release metadata.
		let release: ReleaseInfo
		try {
			release = await fetchLatestReleaseInfo()
		} catch (error) {
			const msg = error instanceof ARSUpdateError ? error.message : UPDATE_CHECK_ERROR
			const detail = error instanceof ARSUpdateError ? error.detail : error instanceof Error ? error.message : String(error)
			Logger.error(`[SkillInstaller] Failed to resolve release metadata: ${detail}`)
			throw new ARSUpdateError(msg, "check", detail)
		}

		const tag = release.tag
		Logger.log(`[SkillInstaller] Installing ARS update ${tag} from ${release.downloadUrl}`)

		// 2. Download tarball.
		const buffer = await downloadReleaseTarball(release.downloadUrl)

		// 3. Prepare temp directory.
		await fs.rm(tmpDir, { recursive: true, force: true })
		await fs.mkdir(tmpDir, { recursive: true })

		// 4. Extract using the tar package (cross-platform, no shell).
		const tarballPath = path.join(tmpDir, "release.tar.gz")
		await fs.writeFile(tarballPath, buffer)
		try {
			await tar.x({
				file: tarballPath,
				cwd: tmpDir,
			})
		} catch (extractError) {
			const detail = extractError instanceof Error ? extractError.message : String(extractError)
			throw new ARSUpdateError(
				"解压 release 压缩包失败，文件可能已损坏",
				"extract",
				`tar extract failed for ${tarballPath}: ${detail}`,
			)
		}

		// 5. Locate the skills root inside the extracted archive.
		const extractedEntries = await fs.readdir(tmpDir)
		const extractedDir = extractedEntries.find(
			(name) => name !== "release.tar.gz" && name.startsWith("academic-research-skills"),
		)
		if (!extractedDir) {
			throw new ARSUpdateError(
				"解压后未找到 release 目录",
				"extract",
				`No academic-research-skills-* directory found under ${tmpDir} after extraction`,
			)
		}
		const extractedRoot = path.join(tmpDir, extractedDir)
		const skillsSourceDir = await findExtractedSkillsRoot(extractedRoot)

		// 6. Copy into workspace skills directory.
		const dstDir = path.join(workspaceRoot, ".clinerules", "skills")
		await fs.mkdir(dstDir, { recursive: true })

		let copied = 0
		let skipped = 0

		// 6a. Copy the four skill directories.
		const skillResult = await copyRecursive(skillsSourceDir, dstDir, Array.from(ARS_RELEASE_SKIP_NAMES))
		copied += skillResult.copied
		skipped += skillResult.skipped

		// 6b. Copy shared support directories from the release root.
		for (const dirName of ARS_SUPPORT_DIRS) {
			const srcPath = path.join(extractedRoot, dirName)
			const dstPath = path.join(dstDir, dirName)
			try {
				await fs.access(srcPath)
				await fs.mkdir(dstPath, { recursive: true })
				const sub = await copyRecursive(srcPath, dstPath, Array.from(ARS_RELEASE_SKIP_NAMES))
				copied += sub.copied
				skipped += sub.skipped
			} catch {
				// Support directory absent in this release — skip.
			}
		}

		if (copied === 0) {
			throw new ARSUpdateError(
				"更新过程中没有复制任何文件，请检查 release 内容",
				"install",
				`Copy from ${extractedRoot} to ${dstDir} produced zero files`,
			)
		}

		// 7. Write installation marker.
		const markerPath = path.join(dstDir, INSTALL_MARKER)
		await fs.writeFile(
			markerPath,
			JSON.stringify(
				{
					installedAt: new Date().toISOString(),
					source: "lingink-ars",
					version: release.version,
					updatedFrom: "github",
					releaseUrl: release.releaseUrl,
				},
				null,
				2,
			),
			"utf-8",
		)

		Logger.log(`[SkillInstaller] Updated ARS skills to ${tag} (${copied} copied, ${skipped} skipped)`)

		// 8. Cleanup temp.
		await fs.rm(tmpDir, { recursive: true, force: true })

		return dstDir
	} catch (error) {
		// Best-effort cleanup on failure.
		await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})

		if (error instanceof ARSUpdateError) {
			throw error
		}
		const detail = error instanceof Error ? error.message : String(error)
		Logger.error(`[SkillInstaller] Unexpected error during ARS update: ${detail}`)
		throw new ARSUpdateError(`升级失败：${detail}`, "unknown", detail)
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
