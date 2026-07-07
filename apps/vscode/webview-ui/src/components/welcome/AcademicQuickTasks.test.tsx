import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import AcademicQuickTasks from "./AcademicQuickTasks"

describe("AcademicQuickTasks", () => {
	it("passes the selected slash command to the input callback", async () => {
		const user = userEvent.setup()
		const onSelectTask = vi.fn()

		render(<AcademicQuickTasks onSelectTask={onSelectTask} />)

		await user.click(screen.getByRole("button", { name: /选题引导/ }))

		expect(onSelectTask).toHaveBeenCalledWith("/research-topic")
	})
})
