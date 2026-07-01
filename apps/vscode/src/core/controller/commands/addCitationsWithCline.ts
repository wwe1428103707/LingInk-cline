import { getFileMentionFromPath } from "@/core/mentions"
import { telemetryService } from "@/services/telemetry"
import { CommandContext, Empty } from "@/shared/proto/index.cline"
import { Logger } from "@/shared/services/Logger"
import { Controller } from "../index"

export async function addCitationsWithCline(controller: Controller, request: CommandContext): Promise<Empty> {
	if (!request.selectedText?.trim()) {
		Logger.log("❌ No text selected for citation check with Cline")
		return {}
	}

	const filePath = request.filePath || ""
	const fileMention = await getFileMentionFromPath(filePath)

	await controller.initTask(
		`请根据以下选中文本的内容，推荐相关学术文献和引用来源，并检查现有引用的完整性和格式规范性：
\n文件：${fileMention}\n\`\`\`\n${request.selectedText}\n\`\`\``,
	)
	Logger.log("addCitationsWithCline", request.selectedText, request.filePath)

	telemetryService.captureButtonClick("codeAction_addCitations", controller.task?.ulid)
	return {}
}
