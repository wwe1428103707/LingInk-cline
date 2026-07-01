import { describe, expect, it } from "vitest"
import { NEW_USER_TYPE } from "../data-steps"

describe("onboarding data steps", () => {
	it("only exposes BYOK user type", () => {
		expect(NEW_USER_TYPE.BYOK).toBe("byok")
	})
})
