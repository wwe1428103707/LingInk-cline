import { Boolean } from "@shared/proto/cline/common"
import { PlanActMode, TogglePlanActModeRequest } from "@shared/proto/cline/state"
import { Mode } from "@shared/storage/types"
import { Logger } from "@/shared/services/Logger"
import { Controller } from ".."

function convertPlanActMode(mode: TogglePlanActModeRequest["mode"] | keyof typeof PlanActMode): Mode {
	if (mode === PlanActMode.PLAN || mode === "PLAN") {
		return "plan"
	}
	if (mode === PlanActMode.ACT || mode === "ACT") {
		return "act"
	}
	if (mode === PlanActMode.ACADEMIC || mode === "ACADEMIC") {
		return "academic"
	}
	throw new Error(`Invalid mode value: ${mode}`)
}

/**
 * Toggles between Plan and Act modes
 * @param controller The controller instance
 * @param request The request containing the chat settings and optional chat content
 * @returns An empty response
 */
export async function togglePlanActModeProto(controller: Controller, request: TogglePlanActModeRequest): Promise<Boolean> {
	try {
		const mode = convertPlanActMode(request.mode)
		const chatContent = request.chatContent

		// Call the existing controller implementation
		const sentMessage = await controller.togglePlanActMode(mode, chatContent)

		return Boolean.create({
			value: sentMessage,
		})
	} catch (error) {
		Logger.error("Failed to toggle Plan/Act mode:", error)
		throw error
	}
}
