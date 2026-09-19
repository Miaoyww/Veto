"use client"

import { useEffect, useState } from "react"
import {
  ArrowUpRight,
  Check,
  CircleDashed,
  Cloud,
  Loader2,
  LockKeyhole,
  LogOut,
  Monitor,
  ShieldCheck,
  UserRound,
} from "lucide-react"
import { useRouter } from "next/navigation"

import { ThemeToggler } from "@/components/theme-toggler"
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
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
        numSquares={24}
        maxOpacity={0.08}
        duration={3}
        repeatDelay={1}
        className="platform-grid-mask fill-primary/10 stroke-border/70 text-primary"
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

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-20">
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)] lg:items-end">
          <div className="min-w-0">
            <p className="mb-4 font-mono text-xs tracking-[0.16em] text-muted-foreground uppercase">
              Veto Platform
            </p>
            <h1 className="platform-title max-w-3xl text-4xl font-bold tracking-[-0.04em] text-balance sm:text-5xl lg:text-6xl">
              从这里，继续你的会议。
            </h1>
          </div>
          <p className="max-w-xl text-base leading-7 text-muted-foreground lg:justify-self-end">
            Platform 是 Veto 的账户与在线服务入口。现在先把身份认证和应用入口放稳，后续功能会沿着这里继续生长。
          </p>
        </section>

        <section aria-labelledby="platform-sections" className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4">
            <h2 id="platform-sections" className="text-lg font-semibold tracking-tight">
              现在可以做什么
            </h2>
            <Badge variant="outline" className="rounded-full px-3 py-1">
              会话已连接
            </Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="platform-feature-card md:col-span-2 lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-xl">进入 Veto 应用</CardTitle>
                <CardDescription className="max-w-xl leading-6">
                  返回会议工作台，继续会务管理、成员协作与现场流程。
                </CardDescription>
                <CardAction>
                  <span className="grid size-11 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Monitor aria-hidden="true" />
                  </span>
                </CardAction>
              </CardHeader>
              <CardContent>
                <div className="platform-app-preview" aria-hidden="true">
                  <div className="platform-app-preview__rail" />
                  <div className="platform-app-preview__body">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="justify-between gap-4 bg-muted/40">
                <p className="hidden text-sm text-muted-foreground sm:block">
                  在新页面打开 app.miaoyww.top
                </p>
                <a
                  href={APP_URL}
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "h-11 rounded-full px-5"
                  )}
                >
                  返回应用
                  <ArrowUpRight data-icon="inline-end" aria-hidden="true" />
                </a>
              </CardFooter>
            </Card>

            <Card className="platform-feature-card">
              <CardHeader>
                <CardTitle>账户与安全</CardTitle>
                <CardDescription className="leading-6">
                  当前设备已保存登录凭证，可安全退出并切换账号。
                </CardDescription>
                <CardAction>
                  <span className="grid size-10 place-items-center rounded-full border bg-background">
                    <ShieldCheck aria-hidden="true" />
                  </span>
                </CardAction>
              </CardHeader>
              <CardContent className="mt-auto flex flex-col gap-3">
                <div className="flex items-center justify-between rounded-lg border bg-background px-3 py-3">
                  <span className="flex items-center gap-2 text-sm">
                    <UserRound className="size-4 text-muted-foreground" aria-hidden="true" />
                    当前会话
                  </span>
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <Check className="size-4" aria-hidden="true" />
                    已登录
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-11 justify-start"
                  onClick={signOut}
                >
                  <LogOut data-icon="inline-start" aria-hidden="true" />
                  退出当前账号
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        <section aria-labelledby="platform-roadmap" className="flex flex-col gap-5">
          <div>
            <h2 id="platform-roadmap" className="text-lg font-semibold tracking-tight">
              Platform 路线
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              主页先展示真实可用状态，尚未完成的入口不会伪装成可点击功能。
            </p>
          </div>

          <div className="grid gap-px overflow-hidden rounded-xl border bg-border md:grid-cols-3">
            <RoadmapItem
              icon={<LockKeyhole aria-hidden="true" />}
              title="身份认证"
              description="邮箱登录、注册与验证码流程"
              status="可用"
              ready
            />
            <RoadmapItem
              icon={<UserRound aria-hidden="true" />}
              title="账户中心"
              description="资料、安全与设备管理"
              status="下一步"
            />
            <RoadmapItem
              icon={<Cloud aria-hidden="true" />}
              title="在线服务"
              description="云端能力与应用协同"
              status="待接入"
            />
          </div>
        </section>
      </main>

      <footer className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-3 border-t px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
        <p>Veto Platform · 让会议工作保持连续</p>
        <p>账户入口与 Veto 应用彼此独立</p>
      </footer>
    </div>
  )
}

function RoadmapItem({
  icon,
  title,
  description,
  status,
  ready = false,
}: {
  icon: React.ReactNode
  title: string
  description: string
  status: string
  ready?: boolean
}) {
  return (
    <article className="flex min-h-44 flex-col justify-between gap-8 bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <span className="grid size-10 place-items-center rounded-lg border bg-background [&_svg]:size-4">
          {icon}
        </span>
        <Badge variant={ready ? "default" : "secondary"}>
          {ready ? <Check data-icon="inline-start" aria-hidden="true" /> : <CircleDashed data-icon="inline-start" aria-hidden="true" />}
          {status}
        </Badge>
      </div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
    </article>
  )
}
