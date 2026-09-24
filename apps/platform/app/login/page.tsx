"use client"

import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { ArrowLeft, Loader2, LogIn, Monitor, UserPlus } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import {
  Tabs,
  TabsList,
  TabsTab,
  TabsPanels,
  TabsPanel,
} from "@/components/animate-ui/components/base/tabs"
import { TypingAnimation } from "@/components/ui/typing-animation"
import { TextAnimate } from "@/components/ui/text-animate"
import {
  login,
  register,
  sendVerificationCode,
  verifyCode,
} from "@/lib/auth-client"
import { ThemeToggler } from "@/components/theme-toggler"
import { BubbleBackground } from "@/components/animate-ui/components/backgrounds/bubble"

type AuthTab = "login" | "register"
type RegisterStage = "email" | "code" | "password"

export default function Page() {
  const [tab, setTab] = useState<AuthTab>("login")
  const router = useRouter()

  useEffect(() => {
    if (localStorage.getItem("veto_token")) {
      router.replace("/")
    }
  }, [router])

  return (
    <div className="relative min-h-svh overflow-clip">
      <a
        href="https://veto.miaoyww.top"
        className="absolute top-6 left-8 z-20 flex items-center gap-3 py-2 pr-4 pl-2"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/favicon.png" alt="Veto" className="size-8" />
        <span className="text-lg font-medium">Veto</span>
      </a>

      <div className="absolute top-6 right-6 z-20">
        <ThemeToggler className="flex size-10 cursor-pointer items-center justify-center rounded-full border bg-card/80 shadow-sm backdrop-blur [&_svg]:size-5" />
      </div>

      <BubbleBackground
        interactive
        className="absolute inset-0"
        aria-hidden="true"
      />

      <div className="relative z-10 flex min-h-svh items-center justify-center">
        <div className="flex w-full max-w-7xl items-center">
          <HeroSection />

          <section className="flex w-full items-center justify-center px-6 py-12 lg:w-[560px]">
            <Card className="w-full max-w-md rounded-2xl bg-card/90 p-0 shadow-2xl ring-0 backdrop-blur-xl">
              <CardHeader className="p-6 pb-4">
                <CardTitle className="text-2xl font-bold">Veto 平台</CardTitle>
                <CardDescription className="text-sm">
                  使用邮箱登录或注册 Veto 账号
                </CardDescription>
              </CardHeader>

              <CardContent className="px-6 pb-5">
                <Tabs
                  value={tab}
                  onValueChange={(value) => setTab(value as AuthTab)}
                  className="gap-4"
                >
                  <TabsList className="w-full">
                    <TabsTab value="login">登录</TabsTab>
                    <TabsTab value="register">注册</TabsTab>
                  </TabsList>

                  <TabsPanels>
                    <TabsPanel value="login">
                      <LoginForm />
                    </TabsPanel>
                    <TabsPanel value="register">
                      <RegisterForm onSuccess={() => setTab("login")} />
                    </TabsPanel>
                  </TabsPanels>
                </Tabs>
              </CardContent>

              <CardFooter className="flex-col gap-3 border-t bg-transparent p-6">
                <div className="flex w-full gap-3">
                  <Button
                    variant="outline"
                    type="button"
                    className="h-12 flex-1 justify-center gap-2 rounded-lg shadow-sm"
                    onClick={() => {
                      window.location.href = "https://app.miaoyww.top"
                    }}
                  >
                    <Monitor className="size-5" />
                    返回应用
                  </Button>

                  <SocialLoginButton image="/wechat.png" label="微信登录" />
                  <SocialLoginButton image="/feishu.png" label="飞书登录" />
                </div>
              </CardFooter>
            </Card>
          </section>
        </div>
      </div>
    </div>
  )
}

function HeroSection() {
  return (
    <section className="hidden flex-1 flex-col justify-center px-12 lg:flex xl:px-24">
      <div className="flex max-w-xl flex-col gap-4">
        <h1 className="text-5xl font-bold tracking-tight text-foreground">
          Build your ideas.
          <br />
          Better than ever.
        </h1>

        <span className="max-w-md text-base text-muted-foreground">
          管理你的会议, 并与其他成员协作. 让模拟联合国会议的组织变得更简单,
          更高效.
        </span>

        <div className="mt-10 flex gap-6 text-sm text-muted-foreground">
          <HeroStat label="会务管理" title="一站式" />
          <HeroStat label="局势同步" title="实时" />
          <HeroStat label="数字化管理" title="全流程" />
        </div>
      </div>
    </section>
  )
}

function HeroStat({ label, title }: { label: string; title: string }) {
  return (
    <div>
      <div className="text-2xl font-bold text-foreground">{title}</div>
      <div>{label}</div>
    </div>
  )
}

function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email.trim() || !password) return

    setBusy(true)
    setError("")
    try {
      const token = await login(email.trim(), password)
      localStorage.setItem("veto_token", token)
      router.replace("/")
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : "登录失败")
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="login-email">邮箱</Label>
        <Input
          id="login-email"
          type="email"
          className="h-12"
          placeholder="name@example.com"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="login-password">密码</Label>
        <Input
          id="login-password"
          type="password"
          className="h-12"
          placeholder="密码"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      <SubmitButton
        icon={<LogIn className="size-4" />}
        busyIcon={<Loader2 className="size-4 animate-spin" />}
        busy={busy}
        disabled={busy || !email.trim() || !password.trim()}
        label="登录"
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  )
}

function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const [stage, setStage] = useState<RegisterStage>("email")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [regToken, setRegToken] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  async function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email.trim()) return

    setBusy(true)
    setError("")
    try {
      await sendVerificationCode(email.trim())
      setStage("code")
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : "发送失败")
    } finally {
      setBusy(false)
    }
  }

  async function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (code.length < 6) return

    setBusy(true)
    setError("")
    try {
      const token = await verifyCode(email.trim(), code)
      setRegToken(token)
      setStage("password")
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : "验证失败")
    } finally {
      setBusy(false)
    }
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (password.length < 6) return

    setBusy(true)
    setError("")
    try {
      await register(regToken, password, name)
      onSuccess()
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : "注册失败")
    } finally {
      setBusy(false)
    }
  }

  function resetToEmail() {
    setStage("email")
    setCode("")
    setRegToken("")
    setError("")
  }

  return (
    <div>
      {stage === "email" ? (
        <form className="flex flex-col gap-4" onSubmit={submitEmail}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="register-email">邮箱</Label>
            <Input
              id="register-email"
              type="email"
              className="h-12"
              placeholder="name@example.com"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <SubmitButton
            icon={<LogIn className="size-4" />}
            busyIcon={<Loader2 className="size-4 animate-spin" />}
            busy={busy}
            disabled={busy || !email.trim()}
            label="发送验证码"
          />
        </form>
      ) : null}

      {stage === "code" ? (
        <div>
          <p className="text-sm text-muted-foreground">
            验证码已发送至{" "}
            <span className="font-medium text-foreground">{email}</span>
          </p>
          <form className="mt-4 flex flex-col gap-4" onSubmit={submitCode}>
            <InputOTP
              maxLength={6}
              value={code}
              onChange={setCode}
              containerClassName="justify-center"
              aria-label="验证码"
            >
              <InputOTPGroup className="gap-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <InputOTPSlot
                    key={index}
                    index={index}
                    className="h-12 w-10 rounded-lg border font-mono text-base"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
            <SubmitButton
              icon={<LogIn className="size-4" />}
              busyIcon={<Loader2 className="size-4 animate-spin" />}
              busy={busy}
              disabled={busy || code.length < 6}
              label="验证"
            />
          </form>
          <div className="mt-3 flex justify-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetToEmail}
            >
              <ArrowLeft className="size-4" />
              返回
            </Button>
          </div>
        </div>
      ) : null}

      {stage === "password" ? (
        <form className="flex flex-col gap-4" onSubmit={submitPassword}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="register-name">姓名（可选）</Label>
            <Input
              id="register-name"
              className="h-12"
              placeholder="姓名"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="register-password">密码</Label>
            <Input
              id="register-password"
              type="password"
              className="h-12"
              placeholder="至少 6 位"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <SubmitButton
            icon={<UserPlus className="size-4" />}
            busyIcon={<Loader2 className="size-4 animate-spin" />}
            busy={busy}
            disabled={busy || password.length < 6}
            label="完成注册"
          />
        </form>
      ) : null}

      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
    </div>
  )
}

function SubmitButton({
  icon,
  busyIcon,
  busy,
  disabled,
  label,
}: {
  icon: ReactNode
  busyIcon: ReactNode
  busy: boolean
  disabled: boolean
  label: string
}) {
  return (
    <Button type="submit" size="lg" disabled={disabled}>
      {busy ? busyIcon : icon}
      {label}
    </Button>
  )
}

function SocialLoginButton({ image, label }: { image: string; label: string }) {
  return (
    <button
      type="button"
      className="size-12 rounded-lg border bg-card p-0 shadow-sm"
      aria-label={label}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} className="mx-auto size-5" alt="" />
    </button>
  )
}
