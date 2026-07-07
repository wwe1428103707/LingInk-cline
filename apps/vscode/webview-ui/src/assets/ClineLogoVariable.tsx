import type { SVGProps } from "react"

type ClineLogoProps = SVGProps<SVGSVGElement> & {
	environment?: unknown
}

const ClineLogoVariable = ({ environment: _environment, ...props }: ClineLogoProps) => (
	<svg aria-label="LingInk" fill="none" role="img" viewBox="0 0 80 80" {...props}>
		<title>LingInk</title>
		<defs>
			<linearGradient gradientUnits="userSpaceOnUse" id="lingink-ring" x1="15" x2="66" y1="18" y2="63">
				<stop stopColor="#FFF4C6" />
				<stop offset="0.42" stopColor="#D59B32" />
				<stop offset="1" stopColor="#7F5A1F" />
			</linearGradient>
			<linearGradient gradientUnits="userSpaceOnUse" id="lingink-river" x1="26" x2="57" y1="42" y2="62">
				<stop stopColor="#F8E7A8" />
				<stop offset="0.52" stopColor="#C88927" />
				<stop offset="1" stopColor="#8B621F" />
			</linearGradient>
			<radialGradient
				cx="0"
				cy="0"
				gradientTransform="translate(47 26) rotate(90) scale(10)"
				gradientUnits="userSpaceOnUse"
				id="lingink-sun"
				r="1">
				<stop stopColor="#FFF9DC" />
				<stop offset="1" stopColor="#D49A31" />
			</radialGradient>
		</defs>
		<path
			d="M62.7 25.2C57.4 14.5 45.2 9 33.5 12.4C21.3 15.9 13.9 28.1 16.1 40.3C18.4 52.8 30.3 61.3 42.8 59.1C51.7 57.5 58.6 51.3 61.3 43.2"
			stroke="url(#lingink-ring)"
			strokeLinecap="round"
			strokeWidth="4.4"
		/>
		<path
			d="M57.2 18.9C46.9 12.8 32.8 15.8 25.7 25.6C19.1 34.7 20.8 48.2 29.3 55.8"
			stroke="url(#lingink-ring)"
			strokeLinecap="round"
			strokeWidth="2.1"
		/>
		<path
			d="M28 42.8C37.9 38.5 50.9 38.9 57.3 43.4C50.9 42.1 41.3 43.1 34.6 46.6C29.9 49.1 30.1 52.1 38.2 52.7C45.3 53.2 52.6 54.4 56.8 58.9"
			stroke="url(#lingink-river)"
			strokeLinecap="round"
			strokeWidth="3.2"
		/>
		<path d="M23.5 57.7C35.2 66.2 51.9 63.3 59.8 51" stroke="url(#lingink-ring)" strokeLinecap="round" strokeWidth="2.4" />
		<circle cx="47.3" cy="26.2" fill="url(#lingink-sun)" r="6.6" />
		<path d="M45.3 37.9C48.6 36.5 52.4 36.2 55.4 37.2" stroke="#E7C26A" strokeLinecap="round" strokeWidth="1.8" />
	</svg>
)

export default ClineLogoVariable
