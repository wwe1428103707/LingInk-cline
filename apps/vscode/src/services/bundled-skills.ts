import * as fs from "node:fs/promises"
import * as path from "node:path"

export type InstallMode = "mergeContents" | "copyDirectory"

export interface InstallableBundledSkillBundle {
	directoryName: string
	displayName: string
	installMode: InstallMode
	sourcePath: string
	skipNames?: string[]
}

export const BUNDLED_SKILLS_DIR = "bundled-skills"

const SKILL_FILE_NAME = "SKILL.md"
const BUNDLED_SKILL_INSTALL_OVERRIDES: Record<string, Pick<InstallableBundledSkillBundle, "displayName" | "skipNames">> = {
	"lingink-ars": {
		displayName: "学术研究技能包 (ARS)",
		skipNames: ["plugin.js", "plugin.ts", "skills"],
	},
	"polish-skills": {
		displayName: "润色技能包",
	},
	"scientific-toolkit-skill": {
		displayName: "实验助手",
	},
	"office-academic-skill": {
		displayName: "Word/PPT 助手",
	},
}

export function getBundledSkillPath(extensionFsPath: string, directoryName: string): string {
	return path.join(extensionFsPath, BUNDLED_SKILLS_DIR, directoryName)
}

export function getBundledSkillsRoot(extensionFsPath: string): string {
	return path.join(extensionFsPath, BUNDLED_SKILLS_DIR)
}

export async function listBundledSkillDirectoryNames(extensionFsPath: string): Promise<string[]> {
	const bundledSkillsRoot = getBundledSkillsRoot(extensionFsPath)
	try {
		const entries = await fs.readdir(bundledSkillsRoot, { withFileTypes: true })
		return entries
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name)
			.sort((a, b) => a.localeCompare(b))
	} catch {
		return []
	}
}

export async function getBundledRuntimeSkillDirectories(extensionFsPath: string): Promise<string[]> {
	const directoryNames = await listBundledSkillDirectoryNames(extensionFsPath)
	return directoryNames.map((directoryName) => getBundledSkillPath(extensionFsPath, directoryName))
}

export async function getInstallableBundledSkillBundles(extensionFsPath: string): Promise<InstallableBundledSkillBundle[]> {
	const directoryNames = await listBundledSkillDirectoryNames(extensionFsPath)
	return Promise.all(
		directoryNames.map(async (directoryName) => {
			const sourcePath = getBundledSkillPath(extensionFsPath, directoryName)
			const installMode = (await hasRootSkillFile(sourcePath)) ? "copyDirectory" : "mergeContents"
			const override = BUNDLED_SKILL_INSTALL_OVERRIDES[directoryName]
			return {
				directoryName,
				displayName: override?.displayName ?? directoryName,
				installMode,
				sourcePath,
				skipNames: override?.skipNames,
			}
		}),
	)
}

export async function getExpectedInstalledSkillFilePaths(extensionFsPath: string, workspaceRoot: string): Promise<string[]> {
	const skillsRoot = path.join(workspaceRoot, ".clinerules", "skills")
	const bundles = await getInstallableBundledSkillBundles(extensionFsPath)
	const expectedPaths: string[] = []
	for (const bundle of bundles) {
		if (bundle.installMode === "copyDirectory") {
			expectedPaths.push(path.join(skillsRoot, bundle.directoryName, SKILL_FILE_NAME))
			continue
		}
		const childSkillNames = await listImmediateChildSkillNames(bundle.sourcePath)
		expectedPaths.push(...childSkillNames.map((skillName) => path.join(skillsRoot, skillName, SKILL_FILE_NAME)))
	}
	return expectedPaths
}

async function hasRootSkillFile(directoryPath: string): Promise<boolean> {
	return fs
		.access(path.join(directoryPath, SKILL_FILE_NAME))
		.then(() => true)
		.catch(() => false)
}

async function listImmediateChildSkillNames(directoryPath: string): Promise<string[]> {
	try {
		const entries = await fs.readdir(directoryPath, { withFileTypes: true })
		const childNames = await Promise.all(
			entries
				.filter((entry) => entry.isDirectory())
				.map(async (entry) => ({
					name: entry.name,
					hasSkill: await hasRootSkillFile(path.join(directoryPath, entry.name)),
				})),
		)
		return childNames
			.filter((entry) => entry.hasSkill)
			.map((entry) => entry.name)
			.sort((a, b) => a.localeCompare(b))
	} catch {
		return []
	}
}
