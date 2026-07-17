import React, { forwardRef, HTMLAttributes, useCallback } from "react"

type TabProps = HTMLAttributes<HTMLDivElement>

export const Tab = ({ className, children, ...props }: TabProps) => (
	<div className={`fixed inset-0 flex flex-col ${className}`} {...props}>
		{children}
	</div>
)

export const TabContent = ({ className, children, ...props }: TabProps) => {
	const onWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
		const target = e.target as HTMLElement

		// Prevent scrolling if the target or any of its ancestors is a listbox or option
		if (target.closest('[role="listbox"], [role="combobox"], [role="option"]')) {
			return
		}

		e.currentTarget.scrollTop += e.deltaY
	}, [])

	return (
		<div className={`flex-1 overflow-auto ${className}`} onWheel={onWheel} {...props}>
			{children}
		</div>
	)
}

export const TabList = forwardRef<
	HTMLDivElement,
	HTMLAttributes<HTMLDivElement> & {
		value: string
		onValueChange: (value: string) => void
	}
>(({ children, className, value, onValueChange, ...props }, ref) => {
	const handleTabSelect = useCallback(
		(tabValue: string) => {
			onValueChange(tabValue)
		},
		[onValueChange],
	)

	// Standard tablist keyboard navigation: ArrowLeft/ArrowRight moves the active
	// tab (wrapping around), Home/End jump to the first/last tab. Focus follows
	// the newly activated tab.
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLDivElement>) => {
			const tabValues = React.Children.toArray(children)
				.filter(React.isValidElement)
				.map((child) => (child as React.ReactElement<{ value: string }>).props.value)

			if (tabValues.length === 0) {
				return
			}

			const currentIndex = tabValues.indexOf(value)
			let nextIndex: number

			switch (e.key) {
				case "ArrowRight":
					nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % tabValues.length
					break
				case "ArrowLeft":
					nextIndex = currentIndex < 0 ? tabValues.length - 1 : (currentIndex - 1 + tabValues.length) % tabValues.length
					break
				case "Home":
					nextIndex = 0
					break
				case "End":
					nextIndex = tabValues.length - 1
					break
				default:
					return
			}

			e.preventDefault()
			handleTabSelect(tabValues[nextIndex])
			e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]')[nextIndex]?.focus()
		},
		[children, value, handleTabSelect],
	)

	return (
		<div className={`flex ${className}`} onKeyDown={handleKeyDown} ref={ref} role="tablist" {...props}>
			{React.Children.map(children, (child) => {
				if (React.isValidElement(child)) {
					// Make sure we're passing the correct props to the TabTrigger
					return React.cloneElement(child as React.ReactElement<any>, {
						isSelected: child.props.value === value,
						onSelect: () => handleTabSelect(child.props.value),
					})
				}
				return child
			})}
		</div>
	)
})

export const TabTrigger = forwardRef<
	HTMLButtonElement,
	React.ButtonHTMLAttributes<HTMLButtonElement> & {
		value: string
		isSelected?: boolean
		onSelect?: () => void
	}
>(({ children, className, value, isSelected, onSelect, ...props }, ref) => {
	// Ensure we're using the value prop correctly
	return (
		<button
			aria-selected={isSelected}
			className={`focus:outline-none ${className}`}
			data-value={value}
			onClick={onSelect}
			ref={ref}
			role="tab"
			tabIndex={isSelected ? 0 : -1} // Add data-value attribute for debugging
			{...props}>
			{children}
		</button>
	)
})
