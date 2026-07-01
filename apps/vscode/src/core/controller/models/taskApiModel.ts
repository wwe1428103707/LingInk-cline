import type { ApiConfiguration, ApiProvider } from "@/shared/api"
import { getProviderDefaultModelId, getProviderModelIdKey } from "@/shared/storage/provider-keys"
import type { Mode } from "@/shared/storage/types"

type TaskApiModel = {
	getModel: () => { id: string }
}

function readString(config: ApiConfiguration, key: keyof ApiConfiguration): string | undefined {
	const value = config[key]
	return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined
}

export function resolveActiveModelIdFromApiConfiguration(config: ApiConfiguration, mode: Mode): string {
	const isPlan = mode === "plan"
	const provider = isPlan ? config.planModeApiProvider : config.actModeApiProvider
	const genericModelKey = isPlan ? "planModeApiModelId" : "actModeApiModelId"

	if (provider) {
		const providerModelKey = getProviderModelIdKey(provider as ApiProvider, mode) as keyof ApiConfiguration
		return (
			readString(config, providerModelKey) ??
			readString(config, genericModelKey) ??
			getProviderDefaultModelId(provider as ApiProvider) ??
			"unknown"
		)
	}

	return readString(config, genericModelKey) ?? "unknown"
}

export function createTaskApiModelShim(modelId: string): TaskApiModel {
	return {
		getModel: () => ({ id: modelId }),
	}
}
