import type { UserOrganization } from "@shared/proto/cline/account"
import type React from "react"
import { createContext, useContext } from "react"

export interface ClineUser {
	uid: string
	email?: string
	displayName?: string
	photoUrl?: string
	appBaseUrl?: string
}

export interface ClineAuthContextType {
	clineUser: ClineUser | null
	organizations: UserOrganization[] | null
	activeOrganization: UserOrganization | null
}

export const ClineAuthContext = createContext<ClineAuthContextType | undefined>(undefined)

/**
 * Simplified provider — always returns null for all auth values.
 * The extension does not require login to function.
 */
export const ClineAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	return (
		<ClineAuthContext.Provider
			value={{
				clineUser: null,
				organizations: null,
				activeOrganization: null,
			}}>
			{children}
		</ClineAuthContext.Provider>
	)
}

export const useClineAuth = () => {
	const context = useContext(ClineAuthContext)
	if (context === undefined) {
		throw new Error("useClineAuth must be used within a ClineAuthProvider")
	}
	return context
}
