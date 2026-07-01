import { type ChildProcess, spawn } from "node:child_process";
import { realpathSync } from "node:fs";
import {
	clearHubDiscovery,
	isAutoUpdateEnabledGlobally,
	probeHubServer,
	readHubDiscovery,
	resolveProductionHubOwnerContext,
	resolveSharedHubOwnerContext,
	stopLocalHubServerGracefully,
} from "@cline/core";
import { resolveClineBuildEnv } from "@cline/shared";
import { version } from "../../package.json";
import { ensureCliHubServer } from "../utils/hub-runtime";
import { c, writeErr, writeln } from "../utils/output";


const DEFAULT_PACKAGE_NAME = "cline";

type CliPackageName = typeof DEFAULT_PACKAGE_NAME;

export enum PackageManager {
	NPM = "npm",
	PNPM = "pnpm",
	YARN = "yarn",
	BUN = "bun",
	NPX = "npx",
	UNKNOWN = "unknown",
}

interface InstallationInfo {
	packageManager: PackageManager;
	packageName: CliPackageName;
	updateCommand?: string;
}

interface ManualUpdateCommand {
	command: string;
	env?: Readonly<Record<string, string>>;
}

function isNightlyVersion(v: string): boolean {
	return v.includes("-nightly.");
}

function getNpmTag(v: string): string {
	return isNightlyVersion(v) ? "nightly" : "latest";
}

interface ParsedVersion {
	base: number[];
	isNightly: boolean;
	timestamp: number;
}

function parseVersion(v: string): ParsedVersion {
	const m = v.match(/^(\d+\.\d+\.\d+)-nightly\.(\d+)$/);
	if (m) {
		return {
			base: m[1].split(".").map(Number),
			isNightly: true,
			timestamp: Number.parseInt(m[2], 10),
		};
	}
	return { base: v.split(".").map(Number), isNightly: false, timestamp: 0 };
}

function compareVersions(v1: string, v2: string): number {
	const p1 = parseVersion(v1);
	const p2 = parseVersion(v2);
	for (let i = 0; i < Math.max(p1.base.length, p2.base.length); i++) {
		const a = p1.base[i] || 0;
		const b = p2.base[i] || 0;
		if (a > b) return 1;
		if (a < b) return -1;
	}
	if (p1.isNightly && !p2.isNightly) return -1;
	if (!p1.isNightly && p2.isNightly) return 1;
	if (p1.isNightly && p2.isNightly) {
		if (p1.timestamp > p2.timestamp) return 1;
		if (p1.timestamp < p2.timestamp) return -1;
	}
	return 0;
}

export function getInstallationInfo(currentVersion: string): InstallationInfo {
	const tag = getNpmTag(currentVersion);
	try {
		const scriptPath = realpathSync(
			process.env.CLINE_WRAPPER_PATH || process.argv[1] || "",
		).replace(/\\/g, "/");

		if (scriptPath.includes("/.npm/_npx") || scriptPath.includes("/npm/_npx")) {
			return {
				packageManager: PackageManager.NPX,
				packageName: DEFAULT_PACKAGE_NAME,
			};
		}
		if (
			scriptPath.includes("/.pnpm/global") ||
			scriptPath.includes("/pnpm/global")
		) {
			return {
				packageManager: PackageManager.PNPM,
				packageName: DEFAULT_PACKAGE_NAME,
				updateCommand: `pnpm add -g ${DEFAULT_PACKAGE_NAME}@${tag}`,
			};
		}
		if (scriptPath.includes("/.yarn/") || scriptPath.includes("/yarn/global")) {
			return {
				packageManager: PackageManager.YARN,
				packageName: DEFAULT_PACKAGE_NAME,
				updateCommand: `yarn global add ${DEFAULT_PACKAGE_NAME}@${tag}`,
			};
		}
		if (scriptPath.includes("/.bun/bin")) {
			return {
				packageManager: PackageManager.BUN,
				packageName: DEFAULT_PACKAGE_NAME,
				updateCommand: `bun add -g ${DEFAULT_PACKAGE_NAME}@${tag}`,
			};
		}
		if (scriptPath.includes("/node_modules/")) {
			return {
				packageManager: PackageManager.NPM,
				packageName: DEFAULT_PACKAGE_NAME,
				updateCommand: `npm update -g ${DEFAULT_PACKAGE_NAME} --tag ${tag}`,
			};
		}
	} catch {
		// Fall through to unknown
	}
	return {
		packageManager: PackageManager.UNKNOWN,
		packageName: DEFAULT_PACKAGE_NAME,
	};
}

export function withMinimumReleaseAgeBypass(
	updateCommand: string,
	packageManager: PackageManager,
): ManualUpdateCommand {
	switch (packageManager) {
		case PackageManager.NPM:
			return { command: `${updateCommand} --min-release-age=0` };
		case PackageManager.PNPM:
			return {
				command: updateCommand,
				env: {
					PNPM_CONFIG_MINIMUM_RELEASE_AGE: "0",
					pnpm_config_minimum_release_age: "0",
					npm_config_minimum_release_age: "0",
				},
			};
		case PackageManager.YARN:
			return {
				command: updateCommand,
				env: { YARN_NPM_MINIMAL_AGE_GATE: "0" },
			};
		case PackageManager.BUN:
			return { command: `${updateCommand} --minimum-release-age=0` };
		default:
			return { command: updateCommand };
	}
}

async function getLatestVersion(
	packageName: CliPackageName,
	currentVersion: string,
): Promise<string | null> {
	const tag = getNpmTag(currentVersion);
	return getLatestPackageVersion(packageName, tag);
}

async function getLatestPackageVersion(
	packageName: string,
	tag = "latest",
): Promise<string | null> {
	try {
		const res = await fetch(
			`https://registry.npmjs.org/${encodeURIComponent(packageName)}/${tag}`,
		);
		if (!res.ok) return null;
		const data = (await res.json()) as { version: string };
		return data.version || null;
	} catch {
		return null;
	}
}


function waitForProcessExit(child: ChildProcess): Promise<number> {
	return new Promise<number>((resolve, reject) => {
		child.once("close", (code) => resolve(code ?? 1));
		child.once("error", reject);
	});
}

async function runCliUpdate(
	updateCommand: ManualUpdateCommand,
): Promise<number> {
	const updateProcess = spawn(updateCommand.command, {
		stdio: "inherit",
		shell: true,
		env: updateCommand.env
			? { ...process.env, ...updateCommand.env }
			: process.env,
		windowsHide: true,
	});
	return waitForProcessExit(updateProcess);
}






const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function resolveCliHubOwnerContext() {
	return resolveClineBuildEnv() === "production"
		? resolveProductionHubOwnerContext()
		: resolveSharedHubOwnerContext();
}

async function waitForHubToStop(
	url: string,
	authToken: string | undefined,
	timeoutMs: number,
): Promise<boolean> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const check = await probeHubServer(url, { authToken }).catch(
			() => undefined,
		);
		if (!check?.url) return true;
		await sleep(100);
	}
	return false;
}

/**
 * Restart the hub server if one is currently running.
 * Gracefully asks the running hub process to stop, falls back to process signals,
 * clears stale discovery, then re-ensures a fresh instance is spawned.
 */
async function restartHubServerIfRunning(): Promise<void> {
	const owner = resolveCliHubOwnerContext();
	const discovery = await readHubDiscovery(owner.discoveryPath).catch(
		() => undefined,
	);

	const health = discovery?.url
		? await probeHubServer(discovery.url, {
				authToken: discovery.authToken,
			}).catch(() => undefined)
		: undefined;
	if (!discovery || !health?.url) return;

	const pid = discovery?.pid;
	writeln(`${c.dim}[hub] restarting server…${c.reset}`);

	let stopped = await stopLocalHubServerGracefully(owner).catch(() => false);
	if (!stopped && pid) {
		try {
			process.kill(pid, "SIGTERM");
		} catch {
			// best-effort
		}
	}

	stopped = await waitForHubToStop(health.url, discovery.authToken, 3_000);
	if (!stopped && pid) {
		try {
			process.kill(pid, "SIGKILL");
		} catch {
			// best-effort
		}
		stopped = await waitForHubToStop(health.url, discovery.authToken, 2_000);
	}

	await clearHubDiscovery(owner.discoveryPath).catch(() => undefined);

	// Re-ensure a fresh hub instance is spawned.
	try {
		await ensureCliHubServer(process.cwd()); // return value intentionally unused here
		writeln(`${c.green}✓${c.reset} ${c.dim}[hub] server restarted${c.reset}`);
	} catch (err) {
		writeErr(
			`[hub] failed to restart server: ${err instanceof Error ? err.message : String(err)}`,
		);
	}
}

/**
 * Non-blocking auto-update check for CLI startup.
 * Spawns a detached install process if a newer version is available.
 * Skipped for npx, dev, unknown installs. Disable with CLINE_NO_AUTO_UPDATE=1.
 */
export function autoUpdateOnStartup(): void {
	if (process.env.IS_DEV === "true") return;
	if (process.env.CLINE_NO_AUTO_UPDATE === "1") return;
	if (!isAutoUpdateEnabledGlobally()) return;

	const { packageName, packageManager, updateCommand } =
		getInstallationInfo(version);
	if (!updateCommand) return;

	void (async () => {
		try {
			const latest = await getLatestVersion(packageName, version);
			if (!latest || compareVersions(version, latest) >= 0) return;
			const autoUpdateCommand = withMinimumReleaseAgeBypass(
				updateCommand,
				packageManager,
			);
			const child = spawn(autoUpdateCommand.command, {
				shell: true,
				detached: true,
				stdio: "ignore",
				env: autoUpdateCommand.env
					? { ...process.env, ...autoUpdateCommand.env }
					: process.env,
				// Prevent a console window from flashing on Windows; detached
				// processes otherwise allocate a new visible console.
				windowsHide: true,
			});
			const exitCode = await waitForProcessExit(child);
			if (exitCode === 0) {
				await restartHubServerIfRunning();
			}
		} catch {
			// Best-effort, silently ignore
		}
	})();
}

export interface CheckForUpdatesOptions {
	verbose?: boolean;
}

/**
 * Manual update: fetch latest version, print status, run the install command.
 * Returns an exit code.
 */
export async function checkForUpdates(
	options: CheckForUpdatesOptions = {},
): Promise<number> {
	const currentVersion = version;
	writeln(`${c.cyan}Checking for updates…${c.reset}`);

	const { packageName, updateCommand, packageManager } =
		getInstallationInfo(currentVersion);

	try {
		const latestVersion = await getLatestVersion(packageName, currentVersion);

		if (options.verbose) {
			writeln(`${c.dim}Current version: ${currentVersion}${c.reset}`);
			writeln(`${c.dim}Package manager: ${packageManager}${c.reset}`);
			writeln(`${c.dim}Package name:    ${packageName}${c.reset}`);
			if (latestVersion) {
				writeln(`${c.dim}Latest version:  ${latestVersion}${c.reset}`);
			}
		}

		if (!latestVersion) {
			writeErr("Failed to check for updates: could not fetch latest version");
			return 1;
		}

		const cliUpdateAvailable =
			compareVersions(currentVersion, latestVersion) < 0;
		const cliIsUpToDate =
			compareVersions(currentVersion, latestVersion) >= 0;

		if (cliIsUpToDate) {
			writeln(
				`${c.green}✓${c.reset} Already on the latest version ${c.bold}${currentVersion}${c.reset}`,
			);
			return 0;
		}

		if (cliUpdateAvailable && latestVersion) {
			writeln(
				`${c.yellow}New version available:${c.reset} ${c.bold}${latestVersion}${c.reset} (current: ${currentVersion})`,
			);
		}

		if (!updateCommand) {
			writeln(
				`${c.dim}Unable to determine Cline update command. Please update manually with your package manager.${c.reset}`,
			);
			return 1;
		}

		const manualUpdateCommand = withMinimumReleaseAgeBypass(
			updateCommand,
			packageManager,
		);
		writeln(
			`${c.cyan}Installing ${packageName}@${latestVersion}…${c.reset}`,
		);
		try {
			const exitCode = await runCliUpdate(manualUpdateCommand);
			if (exitCode === 0) {
				writeln(
					`${c.green}✓${c.reset} Installed update for ${packageName}@${latestVersion}`,
				);
				await restartHubServerIfRunning();
				return 0;
			} else {
				writeErr(
					`Cline update failed (exit code ${exitCode}). Try running: ${manualUpdateCommand.command}`,
				);
				return 1;
			}
		} catch (error) {
			const message =
				error instanceof Error ? error.message : String(error);
			writeErr(
				`Failed to run Cline update command ${manualUpdateCommand.command}: ${message}`,
			);
			return 1;
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		writeErr(`Error checking for updates: ${message}`);
		return 1;
	}
}
