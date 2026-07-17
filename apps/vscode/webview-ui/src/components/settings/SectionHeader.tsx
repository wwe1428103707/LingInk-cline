import { HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

type SectionHeaderProps = HTMLAttributes<HTMLDivElement> & {
	children: React.ReactNode
	description?: string
}

const SectionHeader = ({ description, children, className, ...props }: SectionHeaderProps) => {
	return (
		<div className={cn("text-foreground px-4 py-3", className)} {...props}>
			<h2 className="m-0 text-base">{children}</h2>
			{description && <p className="text-description text-sm mt-2 mb-0">{description}</p>}
		</div>
	)
}

export default SectionHeader
