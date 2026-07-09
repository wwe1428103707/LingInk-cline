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
		`You are an expert writing editor with access to the built-in \`humanizer\` (EN), \`stop-slop\` (EN), and \`humanizer-zh\` (CN) skills. Use their rules to remove AI writing patterns and make the text sound natural and human.

Auto-detect the selected text's language. For English text, apply \`humanizer\` and \`stop-slop\` rules (eliminate AI vocabulary, em dashes, passive voice, formulaic structures, vague attributions). For Chinese text, apply \`humanizer-zh\` rules (去除 AI 写作痕迹：夸大意义、宣传语言、模糊归因、破折号滥用、AI 高频词汇、三段式结构等).

Polish the following selected text — improve fluency, accuracy, and naturalness while preserving the original meaning. Output only the polished text, nothing else.

File: ${fileMention}
\`\`\`
${request.selectedText}
\`\`\``,
	)
	Logger.log("polishWithCline", request.selectedText, request.filePath)

	telemetryService.captureButtonClick("codeAction_polishText", controller.task?.ulid)
	return {}
}
