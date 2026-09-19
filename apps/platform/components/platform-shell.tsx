"use client"

import type { ReactNode } from "react"
import { ArrowLeft, Loader2, LogOut, Monitor } from "lucide-react"
import Link from "next/link"

import { ThemeToggler } from "@/components/theme-toggler"
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const APP_URL = "https://app.miaoyww.top"

export function PlatformLoading({ label = "正在进入 Platform" }) {
  return (
    <main className="grid min-h-svh place-items-center bg-background">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="animate-spin" aria-hidden="true" />
        {label}
      </div>
    </main>
  )
}

export function PlatformShell({
  children,
  onSignOut,
  backHref,
  backLabel = "返回大会列表",
}: {
  children: ReactNode
  onSignOut: () => void
  backHref?: string
  backLabel?: string
}) {
  return (
    <div className="platform-shell relative flex min-h-svh flex-col overflow-clip bg-background">
      <AnimatedGridPattern
        width={52}
        height={52}
        numSquares={20}
        maxOpacity={0.06}
        duration={3}
        repeatDelay={1}
        className="platform-grid-mask fill-primary/10 stroke-border/60 text-primary"
      />

      <header className="relative z-10 flex h-20 shrink-0 items-center justify-between border-b bg-background/85 px-4 backdrop-blur-md sm:px-8 lg:px-12">
        <div className="flex min-w-0 items-center gap-3">
          {backHref ? (
            <Link
              href={backHref}
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon-lg" }),
                "size-11 shrink-0 rounded-full"
              )}
              aria-label={backLabel}
            >
              <ArrowLeft aria-hidden="true" />
            </Link>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/favicon.png" alt="" className="size-9 shrink-0" />
          )}
          <div className="min-w-0 leading-tight">
            <p className="truncate font-semibold tracking-tight">Veto</p>
            <p className="truncate text-xs text-muted-foreground">Platform</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={APP_URL}
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "hidden h-11 rounded-full px-4 sm:inline-flex"
            )}
          >
            <Monitor data-icon="inline-start" aria-hidden="true" />
            返回应用
          </a>
          <ThemeToggler className="flex size-11 cursor-pointer items-center justify-center rounded-full border bg-background shadow-sm transition-colors hover:bg-muted [&_svg]:size-4" />
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            className="size-11 rounded-full"
            onClick={onSignOut}
            aria-label="退出登录"
          >
            <LogOut aria-hidden="true" />
          </Button>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-20">
        {children}
      </main>

      <footer className="relative z-10 flex flex-col items-start justify-between gap-4 border-t bg-muted/50 px-[clamp(1.25rem,4vw,4rem)] py-8 text-[0.625rem] tracking-[0.15em] text-muted-foreground sm:flex-row sm:items-center">
        <span>© VETO / 2026</span>
        <span>QUIET TOOLS FOR LOUD MOMENTS</span>
        <span className="flex items-center gap-[1.375rem]">
          <a
            href="https://github.com/Miaoyww/Veto"
            target="_blank"
            rel="noreferrer"
            className="whitespace-nowrap text-foreground transition-colors hover:text-muted-foreground"
          >
            GITHUB
          </a>
          <a
            href="https://veto.miaoyww.top/#contact"
            className="whitespace-nowrap text-foreground transition-colors hover:text-muted-foreground"
          >
            CONTACT
          </a>
        </span>
      </footer>
    </div>
  )
}
