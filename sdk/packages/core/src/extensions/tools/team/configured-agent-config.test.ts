import { describe, expect, it } from "vitest";
import {
	loadConfiguredAgentConfigs,
	parseConfiguredAgentConfig,
} from "./configured-agent-config";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

describe("configured agent config", () => {
	it("parses a .md agent definition with YAML frontmatter", () => {
		const content = `---
name: Literature Strategist
description: Designs literature search strategies and screens sources.
tools: read_files, search_codebase
skills: deep-research
---

You are a literature strategist. Design a rigorous search strategy.
`;

		const config = parseConfiguredAgentConfig(content);
		expect(config.name).toBe("Literature Strategist");
		expect(config.description).toBe(
			"Designs literature search strategies and screens sources.",
		);
		expect(config.tools).toEqual(["read_files", "search_codebase"]);
		expect(config.skills).toEqual(["deep-research"]);
		expect(config.systemPrompt).toContain("literature strategist");
	});

	it("loads .md and .yaml agents from search paths", () => {
		const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-config-test-"));
		try {
			fs.mkdirSync(path.join(tmpDir, "agents"), { recursive: true });
			fs.writeFileSync(
				path.join(tmpDir, "agents", "reviewer.md"),
				`---\nname: Peer Reviewer\ndescription: Reviews papers.\n---\nYou review papers.`,
				"utf8",
			);
			fs.writeFileSync(
				path.join(tmpDir, "agents", "architect.yaml"),
				`---\nname: Structure Architect\ndescription: Outlines papers.\n---\nYou outline papers.`,
				"utf8",
			);

			const result = loadConfiguredAgentConfigs({
				searchPaths: [path.join(tmpDir, "agents")],
			});

			expect(result.configs).toHaveLength(2);
			const names = result.configs.map((c) => c.name).sort();
			expect(names).toEqual(["Peer Reviewer", "Structure Architect"]);
		} finally {
			fs.rmSync(tmpDir, { recursive: true, force: true });
		}
	});
});
