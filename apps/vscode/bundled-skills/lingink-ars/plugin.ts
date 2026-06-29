import type { AgentPlugin } from "@cline/core";

/**
 * LingInk ARS (Academic Research Skills) Plugin
 *
 * Bundles 4 academic research skills as a Cline plugin:
 *   - deep-research       (13-agent research team)
 *   - academic-paper      (12-agent paper writing)
 *   - academic-paper-reviewer (7-agent peer review)
 *   - academic-pipeline   (5-agent orchestrator)
 *
 * Skills are auto-discovered from the `skills/` subdirectory.
 */
const plugin: AgentPlugin = {
	name: "lingink-ars",
	manifest: {
		capabilities: ["skills"],
	},
}

export default plugin
