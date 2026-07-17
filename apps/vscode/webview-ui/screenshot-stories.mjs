// Temp visual-verification script: serve storybook-static and screenshot key stories in both themes.
// Usage: bun screenshot-stories.mjs  (from apps/vscode/webview-ui, after `bun run build-storybook`)

import { existsSync, mkdirSync, readFileSync } from "node:fs"
import { createServer } from "node:http"
import { extname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { chromium } from "playwright"

const ROOT = fileURLToPath(new URL(".", import.meta.url))
const STATIC_DIR = join(ROOT, "storybook-static")
const OUT_DIR = join(ROOT, ".ui-screenshots")

const MIME = {
	".html": "text/html",
	".js": "text/javascript",
	".css": "text/css",
	".json": "application/json",
	".png": "image/png",
	".jpg": "image/jpeg",
	".svg": "image/svg+xml",
	".woff": "font/woff",
	".woff2": "font/woff2",
	".ttf": "font/ttf",
}

const STORIES = ["views-chat--welcome", "views-chat--active-conversation", "views-chat--empty-state"]
const THEMES = ["vs_dark", "vs_light"]

const server = createServer((req, res) => {
	const url = new URL(req.url, "http://localhost")
	const path = join(STATIC_DIR, decodeURIComponent(url.pathname))
	if (!existsSync(path)) {
		res.writeHead(404)
		res.end("not found")
		return
	}
	res.writeHead(200, { "content-type": MIME[extname(path)] ?? "application/octet-stream" })
	res.end(readFileSync(path))
})

await new Promise((resolve) => server.listen(6007, resolve))
console.log("static server on :6007")

mkdirSync(OUT_DIR, { recursive: true })
const browser = await chromium.launch()
try {
	for (const story of STORIES) {
		for (const theme of THEMES) {
			const page = await browser.newPage({ viewport: { width: 700, height: 800 } })
			await page.goto(`http://localhost:6007/iframe.html?id=${story}&globals=theme:${theme}`, {
				waitUntil: "networkidle",
				timeout: 30000,
			})
			await page.waitForTimeout(1500)
			const file = join(OUT_DIR, `${story}--${theme}.png`)
			await page.screenshot({ path: file, fullPage: false })
			console.log("saved", file)
			await page.close()
		}
	}
} finally {
	await browser.close()
	server.close()
}
