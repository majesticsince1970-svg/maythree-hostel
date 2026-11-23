import * as React from "react"
import { cn } from "@/lib/utils"

interface TabsProps {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
  className?: string
}

export function Tabs({ value, onValueChange, children, className }: TabsProps) {
  return (
    <div className={className} data-value={value}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<TabsListProps | TabsContentProps>, { activeValue: value, onValueChange })
        }
        return child
      })}
    </div>
  )
}

interface TabsListProps {
  children: React.ReactNode
  className?: string
  activeValue?: string
  onValueChange?: (value: string) => void
}

export function TabsList({ children, className, activeValue, onValueChange }: TabsListProps) {
  return (
    <div className={cn("inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground", className)}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<TabsTriggerProps>, { activeValue, onValueChange })
        }
        return child
      })}
    </div>
  )
}

interface TabsTriggerProps {
  value: string
  children: React.ReactNode
  className?: string
  activeValue?: string
  onValueChange?: (value: string) => void
}

export function TabsTrigger({ value, children, className, activeValue, onValueChange }: TabsTriggerProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        activeValue === value
          ? "bg-background text-foreground shadow-sm"
          : "hover:bg-background/50",
        className
      )}
      onClick={() => onValueChange?.(value)}
    >
      {children}
    </button>
  )
}

interface TabsContentProps {
  value: string
  children: React.ReactNode
  className?: string
  activeValue?: string
}

export function TabsContent({ value, children, className, activeValue }: TabsContentProps) {
  if (activeValue !== value) return null
  return <div className={cn("mt-2", className)}>{children}</div>
}
