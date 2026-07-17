import { ActionMetadata } from "./types"

type TranslateFn = (key: string, defaultValue: string) => string

export const getActionMetadata = (t: TranslateFn): ActionMetadata[] => [
	{
		id: "readFiles",
		label: t("autoApprove.readFiles", "Read files"),
		shortName: t("autoApprove.readFiles.short", "Read"),
		icon: "codicon-search",
	},
	{
		id: "editFiles",
		label: t("autoApprove.editFiles", "Edit files"),
		shortName: t("autoApprove.editFiles.short", "Edit"),
		icon: "codicon-edit",
	},
	{
		id: "executeSafeCommands",
		label: t("autoApprove.executeCommands", "Execute commands"),
		shortName: t("autoApprove.executeCommands.short", "Commands"),
		icon: "codicon-terminal",
	},
	{
		id: "useBrowser",
		label: t("autoApprove.useBrowser", "Fetch web content"),
		shortName: t("autoApprove.useBrowser.short", "Web Fetch"),
		icon: "codicon-globe",
	},
	{
		id: "useMcp",
		label: t("autoApprove.useMcp", "Use MCP servers"),
		shortName: t("autoApprove.useMcp.short", "MCP"),
		icon: "codicon-server",
	},
]
