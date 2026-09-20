import { ArrowRight, CalendarDays } from "lucide-react"
import Link from "next/link"
import type { JSX } from "react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { ConferenceSummary } from "@/lib/conference-client"

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "short",
  day: "numeric",
})

interface ConferenceCardProps {
  conference: ConferenceSummary
}

export function ConferenceCard({
  conference,
}: ConferenceCardProps): JSX.Element {
  return (
    <Link
      href={`/conferences/${conference.id}`}
      className="group block h-full rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
    >
      <Card className="h-full bg-muted/40 shadow-none ring-0 transition-colors group-hover:border-foreground/25 group-hover:bg-muted/60">
        <CardHeader className="grid-cols-[minmax(0,1fr)_auto] gap-4">
          <div className="min-w-0">
            <CardTitle className="truncate text-lg">
              {conference.name}
            </CardTitle>
            <CardDescription className="mt-2 line-clamp-2 leading-6">
              {conference.description || "暂无大会说明"}
            </CardDescription>
          </div>
          <CardAction>
            <ArrowRight
              className="mt-1 size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {conference.organizer ? (
            <Badge variant="secondary">{conference.organizer}</Badge>
          ) : null}
          <span className="flex items-center gap-1.5">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            更新于 {dateFormatter.format(new Date(conference.updatedAt))}
          </span>
          <span>v{conference.version}</span>
        </CardContent>
      </Card>
    </Link>
  )
}
