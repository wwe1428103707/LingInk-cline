import { getFileMentionFromPath } from "@/core/mentions"
import { telemetryService } from "@/services/telemetry"
import { CommandContext, Empty } from "@/shared/proto/index.cline"
import { Logger } from "@/shared/services/Logger"
import { Controller } from "../index"

export async function generateReviewResponseWithCline(controller: Controller, request: CommandContext): Promise<Empty> {
	if (!request.selectedText?.trim()) {
		Logger.log("❌ No text selected for review response generation with Cline")
		return {}
	}

	const filePath = request.filePath || ""
	const fileMention = await getFileMentionFromPath(filePath)

	await controller.initTask(
		`请根据以下审稿意见，生成专业的回应（Response to Reviewers），逐条回应审稿人的意见和建议，说明修改内容和理由：
\n文件：${fileMention}\n\`\`\`\n${request.selectedText}\n\`\`\``,
	)
	Logger.log("generateReviewResponseWithCline", request.selectedText, request.filePath)

	telemetryService.captureButtonClick("codeAction_generateReviewResponse", controller.task?.ulid)
	return {}
}
