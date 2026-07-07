interface ClineRecommendedModel {
	id: string
	name: string
	description: string
	tags: string[]
}

export interface ClineRecommendedModelsData {
	recommended: ClineRecommendedModel[]
	free: ClineRecommendedModel[]
}

/**
 * Hardcoded fallback shown when upstream recommended models are not enabled or unavailable.
 */
export const CLINE_RECOMMENDED_MODELS_FALLBACK: ClineRecommendedModelsData = {
	recommended: [
		{
			id: "google/gemini-3.1-pro-preview",
			name: "Google Gemini 3.1 Pro Preview",
			description: "Latest Gemini release with a 1m context window and strong research reasoning",
			tags: ["NEW"],
		},
		{
			id: "anthropic/claude-sonnet-4.6",
			name: "Anthropic Claude Sonnet 4.6",
			description: "Latest Sonnet release with strong writing, analysis, and agent performance",
			tags: ["NEW"],
		},
		{
			id: "anthropic/claude-opus-4.6",
			name: "Anthropic Claude Opus 4.6",
			description: "Most intelligent model for deep research and complex writing tasks",
			tags: ["BEST"],
		},
		{
			id: "openai/gpt-5.3-codex",
			name: "OpenAI GPT-5.3 Codex",
			description: "OpenAI's latest with strong reasoning and structured editing abilities",
			tags: ["NEW"],
		},
	],
	free: [
		{
			id: "kwaipilot/kat-coder-pro",
			name: "KwaiKAT Kat Coder Pro",
			description: "KwaiKAT's advanced agentic model for structured research workflows",
			tags: ["FREE"],
		},
		{
			id: "arcee-ai/trinity-large-preview:free",
			name: "Arcee AI Trinity Large Preview",
			description: "Arcee AI's advanced large preview model in the Trinity series",
			tags: ["FREE"],
		},
	],
}
