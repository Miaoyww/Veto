"use client"

import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible"
import type { JSX } from "react"

function Collapsible({
  ...props
}: CollapsiblePrimitive.Root.Props): JSX.Element {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
}

function CollapsibleTrigger({
  ...props
}: CollapsiblePrimitive.Trigger.Props): JSX.Element {
  return (
    <CollapsiblePrimitive.Trigger data-slot="collapsible-trigger" {...props} />
  )
}

function CollapsibleContent({
  ...props
}: CollapsiblePrimitive.Panel.Props): JSX.Element {
  return (
    <CollapsiblePrimitive.Panel data-slot="collapsible-content" {...props} />
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
