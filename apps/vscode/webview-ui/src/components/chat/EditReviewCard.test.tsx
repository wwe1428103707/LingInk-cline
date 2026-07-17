import type { EditReviewState } from "@shared/ExtensionMessage"
import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import EditReviewCard from "./EditReviewCard"

const mockEditReview = vi.fn<() => EditReviewState | undefined>(() => undefined)
vi.mock("@/context/ExtensionStateContext", () => ({
	useExtensionState: () => ({ editReview: mockEditReview() }),
}))

const postMessageMock = vi.fn()
vi.mock("@/config/platform.config", () => ({
	PLATFORM_CONFIG: {
		postMessage: (...args: unknown[]) => postMessageMock(...args),
	},
}))

function makeState(overrides: Partial<EditReviewState> = {}): EditReviewState {
	return {
		sessionId: "session-1",
		state: "reviewing",
		files: [
			{
				entryId: "entry-1",
				filePath: "/abs/path/src/paper/intro.md",
				relPath: "src/paper/intro.md",
				insertions: 12,
				deletions: 3,
				hunks: [],
			},
			{
				entryId: "entry-2",
				filePath: "/abs/path/src/paper/methods.md",
				relPath: "src/paper/methods.md",
				insertions: 4,
				deletions: 9,
				hunks: [],
			},
		],
		...overrides,
	}
}

describe("EditReviewCard", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockEditReview.mockReturnValue(undefined)
	})

	it("renders nothing when there is no edit review state", () => {
		const { container } = render(<EditReviewCard />)
		expect(container).toBeEmptyDOMElement()
	})

	it("renders nothing when there are no files to review", () => {
		mockEditReview.mockReturnValue(makeState({ files: [] }))
		const { container } = render(<EditReviewCard />)
		expect(container).toBeEmptyDOMElement()
	})

	it("lists pending files with summed diff stats", () => {
		mockEditReview.mockReturnValue(makeState())
		render(<EditReviewCard />)

		expect(screen.getByText("Pending changes")).toBeInTheDocument()
		expect(screen.getByText("src/paper/intro.md")).toBeInTheDocument()
		expect(screen.getByText("src/paper/methods.md")).toBeInTheDocument()
		expect(screen.getByText("+16")).toBeInTheDocument()
		expect(screen.getByText("-12")).toBeInTheDocument()
	})

	it("shows a collecting hint while edits are still being gathered", () => {
		mockEditReview.mockReturnValue(makeState({ state: "collecting" }))
		render(<EditReviewCard />)
		expect(screen.getByText("Collecting changes…")).toBeInTheDocument()
	})

	it("posts acceptAll and rejectAll from the header buttons", () => {
		mockEditReview.mockReturnValue(makeState())
		render(<EditReviewCard />)

		fireEvent.click(screen.getByRole("button", { name: "Keep all" }))
		expect(postMessageMock).toHaveBeenLastCalledWith({
			type: "editReviewAction",
			editReviewAction: { action: "acceptAll" },
		})

		fireEvent.click(screen.getByRole("button", { name: "Undo all" }))
		expect(postMessageMock).toHaveBeenLastCalledWith({
			type: "editReviewAction",
			editReviewAction: { action: "rejectAll" },
		})
	})

	it("posts file-level actions for diff, keep and undo", () => {
		mockEditReview.mockReturnValue(makeState())
		render(<EditReviewCard />)

		fireEvent.click(screen.getAllByRole("button", { name: "Diff" })[0])
		expect(postMessageMock).toHaveBeenLastCalledWith({
			type: "editReviewAction",
			editReviewAction: { action: "openDiff", filePath: "/abs/path/src/paper/intro.md" },
		})

		fireEvent.click(screen.getAllByRole("button", { name: "Keep" })[1])
		expect(postMessageMock).toHaveBeenLastCalledWith({
			type: "editReviewAction",
			editReviewAction: { action: "accept", filePath: "/abs/path/src/paper/methods.md" },
		})

		fireEvent.click(screen.getAllByRole("button", { name: "Undo" })[0])
		expect(postMessageMock).toHaveBeenLastCalledWith({
			type: "editReviewAction",
			editReviewAction: { action: "reject", filePath: "/abs/path/src/paper/intro.md" },
		})
	})
})
