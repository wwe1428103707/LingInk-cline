import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import {
	ACADEMIC_PIPELINE_PROMPT,
	CITATION_CHECK_PROMPT,
	EXPERIMENT_ASSISTANT_PROMPT,
	RESEARCH_TOPIC_PROMPT,
} from "../../../../src/shared/academicShortcutPrompts"
import AcademicQuickTasks from "./AcademicQuickTasks"

describe("AcademicQuickTasks", () => {
	it("passes the selected skill prompt to the input callback", async () => {
		const user = userEvent.setup()
		const onSelectTask = vi.fn()

		render(<AcademicQuickTasks onSelectTask={onSelectTask} />)

		await user.click(screen.getByRole("button", { name: /Topic Selection/ }))
		await user.click(screen.getByRole("button", { name: /Full Research Pipeline/ }))
		await user.click(screen.getByRole("button", { name: /Experiment Assistant/ }))
		await user.click(screen.getByRole("button", { name: /Citation Check/ }))

		expect(onSelectTask).toHaveBeenNthCalledWith(1, RESEARCH_TOPIC_PROMPT)
		expect(onSelectTask).toHaveBeenNthCalledWith(2, ACADEMIC_PIPELINE_PROMPT)
		expect(onSelectTask).toHaveBeenNthCalledWith(3, EXPERIMENT_ASSISTANT_PROMPT)
		expect(onSelectTask).toHaveBeenNthCalledWith(4, CITATION_CHECK_PROMPT)
	})
})
