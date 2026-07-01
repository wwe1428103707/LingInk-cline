import type { ApiConfiguration, ApiProvider, ModelInfo } from "@shared/api"
import type { Mode } from "@shared/storage/types"
import * as reasoningSupport from "@shared/utils/reasoning-support"

export function supportsReasoningEffortForModelId(modelId?: string, _allowShortOpenAiIds = false): boolean {
	return reasoningSupport.supportsReasoningEffortForModel(modelId)
}

// Webview components must source provider models via
// `useProviderModels(providerId)`, which talks to the extension over
// gRPC and ultimately reads from `@cline/llms`. Do not add a static
// catalog here — it would silently bypass the SDK. If a new caller
// needs model lists synchronously, derive them from the catalog hook
// instead.

/**
 * Interface for normalized API configuration
 */
export interface NormalizedApiConfig {
	selectedProvider: ApiProvider
	selectedModelId: string
	selectedModelInfo: ModelInfo
}

const MODE_PREFIX: Record<Mode, string> = {
	plan: "planMode",
	act: "actMode",
	academic: "academicMode",
}


/**
 * Gets mode-specific field values from API configuration
 * @param apiConfiguration The API configuration object
 * @param mode The current mode ("plan", "act", or "academic")
 * @returns Object containing mode-specific field values for clean destructuring
 */
export function getModeSpecificFields(apiConfiguration: ApiConfiguration | undefined, mode: Mode) {
	if (!apiConfiguration) {
		return {
			// Core fields
			apiProvider: undefined,
			apiModelId: undefined,

			// Provider-specific model IDs
			togetherModelId: undefined,
			fireworksModelId: undefined,
			lmStudioModelId: undefined,
			ollamaModelId: undefined,
			liteLlmModelId: undefined,
			requestyModelId: undefined,
			openAiModelId: undefined,
			openRouterModelId: undefined,
			clineModelId: undefined,
			clinePassModelId: undefined,
			groqModelId: undefined,
			basetenModelId: undefined,
			huggingFaceModelId: undefined,
			huaweiCloudMaasModelId: undefined,
			ocaModelId: undefined,
			hicapModelId: undefined,
			aihubmixModelId: undefined,
			nousResearchModelId: undefined,
			vercelAiGatewayModelId: undefined,
			sapAiCoreModelId: undefined,

			// Model info objects
			openAiModelInfo: undefined,
			liteLlmModelInfo: undefined,
			openRouterModelInfo: undefined,
			clineModelInfo: undefined,
			clinePassModelInfo: undefined,
			requestyModelInfo: undefined,
			groqModelInfo: undefined,
			basetenModelInfo: undefined,
			huggingFaceModelInfo: undefined,
			vsCodeLmModelSelector: undefined,
			hicapModelInfo: undefined,
			aihubmixModelInfo: undefined,
			vercelAiGatewayModelInfo: undefined,

			// AWS Bedrock fields
			awsBedrockCustomSelected: undefined,
			awsBedrockCustomModelBaseId: undefined,

			// Huawei Cloud Maas Model Info
			huaweiCloudMaasModelInfo: undefined,

			// Other mode-specific fields
			thinkingBudgetTokens: undefined,
			reasoningEffort: undefined,

			// Oracle Code Assist
			ocaModelInfo: undefined,
		}
	}

	const p = MODE_PREFIX[mode]

	return {
		// Core fields
		apiProvider: apiConfiguration[`${p}ApiProvider` as keyof ApiConfiguration] as ApiProvider | undefined,
		apiModelId: apiConfiguration[`${p}ApiModelId` as keyof ApiConfiguration] as string | undefined,

		// Provider-specific model IDs
		togetherModelId: apiConfiguration[`${p}TogetherModelId` as keyof ApiConfiguration] as string | undefined,
		fireworksModelId: apiConfiguration[`${p}FireworksModelId` as keyof ApiConfiguration] as string | undefined,
		lmStudioModelId: apiConfiguration[`${p}LmStudioModelId` as keyof ApiConfiguration] as string | undefined,
		ollamaModelId: apiConfiguration[`${p}OllamaModelId` as keyof ApiConfiguration] as string | undefined,
		liteLlmModelId: apiConfiguration[`${p}LiteLlmModelId` as keyof ApiConfiguration] as string | undefined,
		requestyModelId: apiConfiguration[`${p}RequestyModelId` as keyof ApiConfiguration] as string | undefined,
		openAiModelId: apiConfiguration[`${p}OpenAiModelId` as keyof ApiConfiguration] as string | undefined,
		openRouterModelId: apiConfiguration[`${p}OpenRouterModelId` as keyof ApiConfiguration] as string | undefined,
		clineModelId: apiConfiguration[`${p}ClineModelId` as keyof ApiConfiguration] as string | undefined,
		clinePassModelId: apiConfiguration[`${p}ClinePassModelId` as keyof ApiConfiguration] as string | undefined,
		groqModelId: apiConfiguration[`${p}GroqModelId` as keyof ApiConfiguration] as string | undefined,
		basetenModelId: apiConfiguration[`${p}BasetenModelId` as keyof ApiConfiguration] as string | undefined,
		huggingFaceModelId: apiConfiguration[`${p}HuggingFaceModelId` as keyof ApiConfiguration] as string | undefined,
		huaweiCloudMaasModelId: apiConfiguration[`${p}HuaweiCloudMaasModelId` as keyof ApiConfiguration] as string | undefined,
		ocaModelId: apiConfiguration[`${p}OcaModelId` as keyof ApiConfiguration] as string | undefined,
		hicapModelId: apiConfiguration[`${p}HicapModelId` as keyof ApiConfiguration] as string | undefined,
		aihubmixModelId: apiConfiguration[`${p}AihubmixModelId` as keyof ApiConfiguration] as string | undefined,
		nousResearchModelId: apiConfiguration[`${p}NousResearchModelId` as keyof ApiConfiguration] as string | undefined,
		sapAiCoreModelId: apiConfiguration[`${p}SapAiCoreModelId` as keyof ApiConfiguration] as string | undefined,
		vercelAiGatewayModelId: apiConfiguration[`${p}VercelAiGatewayModelId` as keyof ApiConfiguration] as string | undefined,

		// Model info objects
		openAiModelInfo: apiConfiguration[`${p}OpenAiModelInfo` as keyof ApiConfiguration] as any,
		liteLlmModelInfo: apiConfiguration[`${p}LiteLlmModelInfo` as keyof ApiConfiguration] as any,
		openRouterModelInfo: apiConfiguration[`${p}OpenRouterModelInfo` as keyof ApiConfiguration] as any,
		clineModelInfo: apiConfiguration[`${p}ClineModelInfo` as keyof ApiConfiguration] as any,
		clinePassModelInfo: apiConfiguration[`${p}ClinePassModelInfo` as keyof ApiConfiguration] as any,
		requestyModelInfo: apiConfiguration[`${p}RequestyModelInfo` as keyof ApiConfiguration] as any,
		groqModelInfo: apiConfiguration[`${p}GroqModelInfo` as keyof ApiConfiguration] as any,
		basetenModelInfo: apiConfiguration[`${p}BasetenModelInfo` as keyof ApiConfiguration] as any,
		huggingFaceModelInfo: apiConfiguration[`${p}HuggingFaceModelInfo` as keyof ApiConfiguration] as any,
		vsCodeLmModelSelector: apiConfiguration[`${p}VsCodeLmModelSelector` as keyof ApiConfiguration] as any,
		hicapModelInfo: apiConfiguration[`${p}HicapModelInfo` as keyof ApiConfiguration] as any,
		aihubmixModelInfo: apiConfiguration[`${p}AihubmixModelInfo` as keyof ApiConfiguration] as any,
		vercelAiGatewayModelInfo: apiConfiguration[`${p}VercelAiGatewayModelInfo` as keyof ApiConfiguration] as any,

		// AWS Bedrock fields
		awsBedrockCustomSelected: apiConfiguration[`${p}AwsBedrockCustomSelected` as keyof ApiConfiguration] as boolean | undefined,
		awsBedrockCustomModelBaseId: apiConfiguration[`${p}AwsBedrockCustomModelBaseId` as keyof ApiConfiguration] as string | undefined,

		// Huawei Cloud Maas Model Info
		huaweiCloudMaasModelInfo: apiConfiguration[`${p}HuaweiCloudMaasModelInfo` as keyof ApiConfiguration] as any,

		// Other mode-specific fields
		thinkingBudgetTokens: apiConfiguration[`${p}ThinkingBudgetTokens` as keyof ApiConfiguration] as number | undefined,
		reasoningEffort: apiConfiguration[`${p}ReasoningEffort` as keyof ApiConfiguration] as string | undefined,
		// Oracle Code Assist
		ocaModelInfo: apiConfiguration[`${p}OcaModelInfo` as keyof ApiConfiguration] as any,
	}
}

/**
 * Synchronizes mode configurations by copying the source mode's settings to all modes
 * This is used when the "Use different models for Plan and Act modes" toggle is unchecked
 */
export async function syncModeConfigurations(
	apiConfiguration: ApiConfiguration | undefined,
	sourceMode: Mode,
	handleFieldsChange: (updates: Partial<ApiConfiguration>) => Promise<void>,
): Promise<void> {
	if (!apiConfiguration) {
		return
	}

	const sourceFields = getModeSpecificFields(apiConfiguration, sourceMode)
	const { apiProvider } = sourceFields

	if (!apiProvider) {
		return
	}

	// Build the complete update object with all mode fields
	const updates: Partial<ApiConfiguration> = {
		// Always sync common fields
		planModeApiProvider: sourceFields.apiProvider,
		actModeApiProvider: sourceFields.apiProvider,
		academicModeApiProvider: sourceFields.apiProvider,
		planModeThinkingBudgetTokens: sourceFields.thinkingBudgetTokens,
		actModeThinkingBudgetTokens: sourceFields.thinkingBudgetTokens,
		academicModeThinkingBudgetTokens: sourceFields.thinkingBudgetTokens,
		planModeReasoningEffort: sourceFields.reasoningEffort,
		actModeReasoningEffort: sourceFields.reasoningEffort,
		academicModeReasoningEffort: sourceFields.reasoningEffort,
	}

	// Handle provider-specific fields
	switch (apiProvider) {
		case "openrouter":
			updates.planModeOpenRouterModelId = sourceFields.openRouterModelId
			updates.actModeOpenRouterModelId = sourceFields.openRouterModelId
			updates.academicModeOpenRouterModelId = sourceFields.openRouterModelId
			updates.planModeOpenRouterModelInfo = sourceFields.openRouterModelInfo
			updates.actModeOpenRouterModelInfo = sourceFields.openRouterModelInfo
			updates.academicModeOpenRouterModelInfo = sourceFields.openRouterModelInfo
			break

		case "cline":
			updates.planModeClineModelId = sourceFields.clineModelId
			updates.actModeClineModelId = sourceFields.clineModelId
			updates.academicModeClineModelId = sourceFields.clineModelId
			updates.planModeClineModelInfo = sourceFields.clineModelInfo
			updates.actModeClineModelInfo = sourceFields.clineModelInfo
			updates.academicModeClineModelInfo = sourceFields.clineModelInfo
			break

		case "cline-pass":
			updates.planModeClinePassModelId = sourceFields.clinePassModelId
			updates.actModeClinePassModelId = sourceFields.clinePassModelId
			updates.academicModeClinePassModelId = sourceFields.clinePassModelId
			updates.planModeClinePassModelInfo = sourceFields.clinePassModelInfo
			updates.actModeClinePassModelInfo = sourceFields.clinePassModelInfo
			updates.academicModeClinePassModelInfo = sourceFields.clinePassModelInfo
			break

		case "openai":
			updates.planModeOpenAiModelId = sourceFields.openAiModelId
			updates.actModeOpenAiModelId = sourceFields.openAiModelId
			updates.academicModeOpenAiModelId = sourceFields.openAiModelId
			updates.planModeOpenAiModelInfo = sourceFields.openAiModelInfo
			updates.actModeOpenAiModelInfo = sourceFields.openAiModelInfo
			updates.academicModeOpenAiModelInfo = sourceFields.openAiModelInfo
			break

		case "ollama":
			updates.planModeOllamaModelId = sourceFields.ollamaModelId
			updates.actModeOllamaModelId = sourceFields.ollamaModelId
			updates.academicModeOllamaModelId = sourceFields.ollamaModelId
			break

		case "lmstudio":
			updates.planModeLmStudioModelId = sourceFields.lmStudioModelId
			updates.actModeLmStudioModelId = sourceFields.lmStudioModelId
			updates.academicModeLmStudioModelId = sourceFields.lmStudioModelId
			break

		case "litellm":
			updates.planModeLiteLlmModelId = sourceFields.liteLlmModelId
			updates.actModeLiteLlmModelId = sourceFields.liteLlmModelId
			updates.academicModeLiteLlmModelId = sourceFields.liteLlmModelId
			updates.planModeLiteLlmModelInfo = sourceFields.liteLlmModelInfo
			updates.actModeLiteLlmModelInfo = sourceFields.liteLlmModelInfo
			updates.academicModeLiteLlmModelInfo = sourceFields.liteLlmModelInfo
			break

		case "requesty":
			updates.planModeRequestyModelId = sourceFields.requestyModelId
			updates.actModeRequestyModelId = sourceFields.requestyModelId
			updates.academicModeRequestyModelId = sourceFields.requestyModelId
			updates.planModeRequestyModelInfo = sourceFields.requestyModelInfo
			updates.actModeRequestyModelInfo = sourceFields.requestyModelInfo
			updates.academicModeRequestyModelInfo = sourceFields.requestyModelInfo
			break

		case "together":
			updates.planModeTogetherModelId = sourceFields.togetherModelId
			updates.actModeTogetherModelId = sourceFields.togetherModelId
			updates.academicModeTogetherModelId = sourceFields.togetherModelId
			break

		case "fireworks":
			updates.planModeFireworksModelId = sourceFields.fireworksModelId
			updates.actModeFireworksModelId = sourceFields.fireworksModelId
			updates.academicModeFireworksModelId = sourceFields.fireworksModelId
			break

		case "sapaicore":
			updates.planModeSapAiCoreModelId = sourceFields.sapAiCoreModelId
			updates.actModeSapAiCoreModelId = sourceFields.sapAiCoreModelId
			updates.academicModeSapAiCoreModelId = sourceFields.sapAiCoreModelId
			break

		case "groq":
			updates.planModeGroqModelId = sourceFields.groqModelId
			updates.actModeGroqModelId = sourceFields.groqModelId
			updates.academicModeGroqModelId = sourceFields.groqModelId
			updates.planModeGroqModelInfo = sourceFields.groqModelInfo
			updates.actModeGroqModelInfo = sourceFields.groqModelInfo
			updates.academicModeGroqModelInfo = sourceFields.groqModelInfo
			break

		case "baseten":
			updates.planModeBasetenModelId = sourceFields.basetenModelId
			updates.actModeBasetenModelId = sourceFields.basetenModelId
			updates.academicModeBasetenModelId = sourceFields.basetenModelId
			updates.planModeBasetenModelInfo = sourceFields.basetenModelInfo
			updates.actModeBasetenModelInfo = sourceFields.basetenModelInfo
			updates.academicModeBasetenModelInfo = sourceFields.basetenModelInfo
			break

		case "huggingface":
			updates.planModeHuggingFaceModelId = sourceFields.huggingFaceModelId
			updates.actModeHuggingFaceModelId = sourceFields.huggingFaceModelId
			updates.academicModeHuggingFaceModelId = sourceFields.huggingFaceModelId
			updates.planModeHuggingFaceModelInfo = sourceFields.huggingFaceModelInfo
			updates.actModeHuggingFaceModelInfo = sourceFields.huggingFaceModelInfo
			updates.academicModeHuggingFaceModelInfo = sourceFields.huggingFaceModelInfo
			break

		case "huawei-cloud-maas":
			updates.planModeHuaweiCloudMaasModelId = sourceFields.huaweiCloudMaasModelId
			updates.actModeHuaweiCloudMaasModelId = sourceFields.huaweiCloudMaasModelId
			updates.academicModeHuaweiCloudMaasModelId = sourceFields.huaweiCloudMaasModelId
			updates.planModeHuaweiCloudMaasModelInfo = sourceFields.huaweiCloudMaasModelInfo
			updates.actModeHuaweiCloudMaasModelInfo = sourceFields.huaweiCloudMaasModelInfo
			updates.academicModeHuaweiCloudMaasModelInfo = sourceFields.huaweiCloudMaasModelInfo
			break

		case "oca":
			updates.planModeOcaModelId = sourceFields.ocaModelId
			updates.actModeOcaModelId = sourceFields.ocaModelId
			updates.academicModeOcaModelId = sourceFields.ocaModelId
			updates.planModeOcaModelInfo = sourceFields.ocaModelInfo
			updates.actModeOcaModelInfo = sourceFields.ocaModelInfo
			updates.academicModeOcaModelInfo = sourceFields.ocaModelInfo
			break

		case "aihubmix":
			updates.planModeAihubmixModelId = sourceFields.aihubmixModelId
			updates.actModeAihubmixModelId = sourceFields.aihubmixModelId
			updates.academicModeAihubmixModelId = sourceFields.aihubmixModelId
			updates.planModeAihubmixModelInfo = sourceFields.aihubmixModelInfo
			updates.actModeAihubmixModelInfo = sourceFields.aihubmixModelInfo
			updates.academicModeAihubmixModelInfo = sourceFields.aihubmixModelInfo
			break

		case "hicap":
			updates.planModeHicapModelId = sourceFields.hicapModelId
			updates.actModeHicapModelId = sourceFields.hicapModelId
			updates.academicModeHicapModelId = sourceFields.hicapModelId
			updates.planModeHicapModelInfo = sourceFields.hicapModelInfo
			updates.actModeHicapModelInfo = sourceFields.hicapModelInfo
			updates.academicModeHicapModelInfo = sourceFields.hicapModelInfo
			break

		case "nousResearch":
			updates.planModeNousResearchModelId = sourceFields.nousResearchModelId
			updates.actModeNousResearchModelId = sourceFields.nousResearchModelId
			updates.academicModeNousResearchModelId = sourceFields.nousResearchModelId
			break

		case "vercel-ai-gateway":
			updates.planModeVercelAiGatewayModelId = sourceFields.vercelAiGatewayModelId
			updates.actModeVercelAiGatewayModelId = sourceFields.vercelAiGatewayModelId
			updates.academicModeVercelAiGatewayModelId = sourceFields.vercelAiGatewayModelId
			updates.planModeVercelAiGatewayModelInfo = sourceFields.vercelAiGatewayModelInfo
			updates.actModeVercelAiGatewayModelInfo = sourceFields.vercelAiGatewayModelInfo
			updates.academicModeVercelAiGatewayModelInfo = sourceFields.vercelAiGatewayModelInfo
			break

		// Generic providers (Anthropic, Gemini, DeepSeek, etc.)
		default:
			updates.planModeApiModelId = sourceFields.apiModelId
			updates.actModeApiModelId = sourceFields.apiModelId
			updates.academicModeApiModelId = sourceFields.apiModelId
			break
	}

	await handleFieldsChange(updates)
}
export { filterOpenRouterModelIds } from "@shared/utils/model-filters"
