import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"

interface SuccessButtonTWProps extends React.ComponentProps<typeof VSCodeButton> {}

const SuccessButtonTW: React.FC<SuccessButtonTWProps> = (props) => {
	return (
		<VSCodeButton
			{...props}
			className={`
				bg-success-solid!
				border-success-solid!
				text-white!
				hover:bg-success-solid-hover!
				hover:border-success-solid-hover!
				active:bg-success-solid-active!
				active:border-success-solid-active!
				${props.className || ""}
			`
				.replace(/\s+/g, " ")
				.trim()}
		/>
	)
}

export default SuccessButtonTW
