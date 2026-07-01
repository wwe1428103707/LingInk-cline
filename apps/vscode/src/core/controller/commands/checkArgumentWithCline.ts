import { getFileMentionFromPath } from "@/core/mentions"
import { telemetryService } from "@/services/telemetry"
import { CommandContext, Empty } from "@/shared/proto/index.cline"
import { Logger } from "@/shared/services/Logger"
import { Controller } from "../index"

export async function checkArgumentWithCline(controller: Controller, request: CommandContext): Promise<Empty> {
	if (!request.selectedText?.trim()) {
		Logger.log("❌ No text selected for argument check with Cline")
		return {}
	}

	const filePath = request.filePath || ""
	const fileMention = await getFileMentionFromPath(filePath)

	await controller.initTask(
		`请检查以下选中文本中的论证逻辑，识别逻辑漏洞、论证不足、证据缺失或推理错误，并给出改进建议：
\n文件：${fileMention}\n\`\`\`\n${request.selectedText}\n\`\`\``,
	)
	Logger.log("checkArgumentWithCline", request.selectedText, request.filePath)

	telemetryService.captureButtonClick("codeAction_checkArgument", controller.task?.ulid)
	return {}
}
