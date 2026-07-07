import { SVGProps } from "react"
import type { Environment } from "../../../src/shared/config-types"
import { getEnvironmentColor } from "../utils/environmentColors"

/**
 * ClineLogoVariable component renders the LingInk logo with automatic theme adaptation
 * and environment-based color indicators.
 *
 * This component uses VS Code theme variables for the fill color, with environment-specific colors:
 * - Local: yellow/orange (development/experimental)
 * - Staging: blue (stable testing)
 * - Production: gray/white (default icon color)
 *
 * @param {SVGProps<SVGSVGElement> & { environment?: Environment }} props - Standard SVG props plus optional environment
 * @returns {JSX.Element} SVG LingInk logo that adapts to VS Code themes and environment
 */
const ClineLogoVariable = (props: SVGProps<SVGSVGElement> & { environment?: Environment }) => {
	const { environment, ...svgProps } = props

	// Determine fill color based on environment
	const fillColor = environment ? getEnvironmentColor(environment) : "var(--vscode-icon-foreground)"

	return (
		<svg fill="none" height="50" viewBox="0 0 47 50" width="47" xmlns="http://www.w3.org/2000/svg" {...svgProps}>
			<title>LingInk</title>
			<path
				d="M6 7.5C6 5.29086 7.79086 3.5 10 3.5H21C22.6569 3.5 24 4.84315 24 6.5V43.5C24 45.1569 22.6569 46.5 21 46.5H10C7.79086 46.5 6 44.7091 6 42.5V7.5ZM11.5 12.5C10.3954 12.5 9.5 13.3954 9.5 14.5C9.5 15.6046 10.3954 16.5 11.5 16.5H18.5C19.6046 16.5 20.5 15.6046 20.5 14.5C20.5 13.3954 19.6046 12.5 18.5 12.5H11.5ZM11.5 21C10.3954 21 9.5 21.8954 9.5 23C9.5 24.1046 10.3954 25 11.5 25H17.5C18.6046 25 19.5 24.1046 19.5 23C19.5 21.8954 18.6046 21 17.5 21H11.5ZM23 6.5C23 4.84315 24.3431 3.5 26 3.5H37C39.2091 3.5 41 5.29086 41 7.5V42.5C41 44.7091 39.2091 46.5 37 46.5H26C24.3431 46.5 23 45.1569 23 43.5V6.5ZM29.8 17.2C30.6686 15.225 33.3314 15.225 34.2 17.2L37.8 25.4C40.2 30.8 36.25 37 32 37C27.75 37 23.8 30.8 26.2 25.4L29.8 17.2ZM32 25C30.8954 25 30 25.8954 30 27C30 28.1046 30.8954 29 32 29C33.1046 29 34 28.1046 34 27C34 25.8954 33.1046 25 32 25Z"
				fill={fillColor}
			/>
		</svg>
	)
}
export default ClineLogoVariable
