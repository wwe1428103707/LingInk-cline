import { getFileMentionFromPath } from "@/core/mentions"
import { telemetryService } from "@/services/telemetry"
import { CommandContext, Empty } from "@/shared/proto/index.cline"
import { Logger } from "@/shared/services/Logger"
import { Controller } from "../index"

export async function polishWithCline(controller: Controller, request: CommandContext): Promise<Empty> {
	if (!request.selectedText?.trim()) {
		Logger.log("❌ No text selected for polish with Cline")
		return {}
	}

	const filePath = request.filePath || ""
	const fileMention = await getFileMentionFromPath(filePath)

	await controller.initTask(
		`请润色以下选中文本，优化语言表达，使其更加流畅、准确、符合学术规范，保持原意不变：
\n文件：${fileMention}\n\`\`\`\n${request.selectedText}\n\`\`\``,
	)
	Logger.log("polishWithCline", request.selectedText, request.filePath)

	telemetryService.captureButtonClick("codeAction_polishText", controller.task?.ulid)
	return {}
}
