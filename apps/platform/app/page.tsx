"use client"

import { useEffect, useState } from "react"
import { Cloud, Loader2, LogOut, Monitor, Plus } from "lucide-react"
import { useRouter } from "next/navigation"

import { ThemeToggler } from "@/components/theme-toggler"
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

const APP_URL = "https://app.miaoyww.top"

export default function PlatformHome() {
  const router = useRouter()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem("veto_token")) {
      router.replace("/login")
      return
    }

    setIsReady(true)
  }, [router])

  function signOut() {
    localStorage.removeItem("veto_token")
    router.replace("/login")
  }

  if (!isReady) {
    return (
      <main className="grid min-h-svh place-items-center bg-background">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="animate-spin" aria-hidden="true" />
          正在进入 Platform
        </div>
      </main>
    )
  }

  return (
    <div className="platform-shell relative min-h-svh overflow-clip bg-background">
      <AnimatedGridPattern
        width={52}
        height={52}
        numSquares={20}
        maxOpacity={0.06}
        duration={3}
        repeatDelay={1}
        className="platform-grid-mask fill-primary/10 stroke-border/60 text-primary"
      />

      <header className="relative z-10 flex h-20 items-center justify-between border-b bg-background/85 px-4 backdrop-blur-md sm:px-8 lg:px-12">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/favicon.png" alt="" className="size-9" />
          <div className="leading-tight">
            <p className="font-semibold tracking-tight">Veto</p>
            <p className="text-xs text-muted-foreground">Platform</p>
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
            onClick={signOut}
            aria-label="退出登录"
          >
            <LogOut aria-hidden="true" />
          </Button>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col px-4 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-20">
        <section className="grid gap-8 border-b pb-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="min-w-0">
            <h1 className="platform-title text-4xl font-bold tracking-[-0.04em] text-balance sm:text-5xl">
              云端大会
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              创建和管理由 Veto 云端托管的大会。大会创建后，会在这里统一显示。
            </p>
          </div>

          <div className="flex flex-col items-start gap-2 lg:items-end">
            <Button
              type="button"
              size="lg"
              className="h-11 rounded-full px-5"
              disabled
            >
              <Plus data-icon="inline-start" aria-hidden="true" />
              创建云端大会
            </Button>
            <p className="text-xs text-muted-foreground">创建接口接入后开放</p>
          </div>
        </section>

        <section
          aria-labelledby="conference-list"
          className="flex flex-col gap-5 pt-10"
        >
          <div>
            <h2
              id="conference-list"
              className="text-lg font-semibold tracking-tight"
            >
              我管理的大会
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              你创建或拥有管理权限的云端大会会出现在这里。
            </p>
          </div>

          <Card className="min-h-80 border-dashed bg-card/70 shadow-none ring-0">
            <CardContent className="grid flex-1 place-items-center px-6 py-14">
              <div className="flex w-full max-w-sm flex-col items-center text-center">
                <span className="mb-5 grid size-12 place-items-center rounded-xl border bg-background shadow-sm">
                  <Cloud className="size-5" aria-hidden="true" />
                </span>
                <CardHeader className="w-full items-center px-0 py-0">
                  <CardTitle className="text-lg">还没有云端大会</CardTitle>
                  <CardDescription className="mt-1 max-w-xs leading-6">
                    大会数据接入后，这里会成为你的云端大会管理入口。
                  </CardDescription>
                </CardHeader>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="relative z-10 flex flex-col items-start justify-between gap-4 border-t bg-muted/50 px-[clamp(1.25rem,4vw,4rem)] py-7 text-[0.625rem] tracking-[0.15em] text-muted-foreground sm:flex-row sm:items-center">
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
          <button
            type="button"
            className="cursor-pointer whitespace-nowrap text-foreground transition-colors hover:text-muted-foreground"
            onClick={() => {
              window.location.href = "https://veto.miaoyww.top/#contact"
            }}
          >
            CONTACT
          </button>
        </span>
      </footer>
    </div>
  )
}
