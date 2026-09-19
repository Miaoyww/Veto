"use client"

import { useState } from "react"
import { Loader2, LogIn } from "lucide-react"

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
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TypingAnimation } from "@/components/ui/typing-animation"
import { TextAnimate } from "@/components/ui/text-animate"

type LoginTab = "invite" | "email"

export default function Page() {
  const [tab, setTab] = useState<LoginTab>("invite")
  const [inviteCode, setInviteCode] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)

  return (
    <div className="relative min-h-svh overflow-clip bg-background">
      <div className="flowing-background" aria-hidden="true">
        <span className="flowing-background__veil flowing-background__veil--strong" />
        <span className="flowing-background__veil flowing-background__veil--soft" />
      </div>

      <div className="relative z-10 flex min-h-svh items-center justify-center">
        <div className="flex w-full max-w-7xl items-center">
          <HeroSection />

          <section className="flex w-full items-center justify-center px-6 py-12 lg:w-[560px]">
            <Card className="w-full max-w-md rounded-2xl bg-card/90 p-0 shadow-2xl ring-0 backdrop-blur-xl">
              <CardHeader className="p-6 pb-4">
                <CardTitle className="text-2xl font-bold">加入大会</CardTitle>
                <CardDescription className="text-sm">
                  使用席位邀请码或邮箱进入云端大会
                </CardDescription>
              </CardHeader>

              <CardContent className="px-6 pb-5">
                <Tabs
                  value={tab}
                  onValueChange={(value) => setTab(value as LoginTab)}
                  className="gap-4"
                >
                  <TabsList className="w-full">
                    <TabsTrigger value="invite">邀请码</TabsTrigger>
                    <TabsTrigger value="email">邮箱登录</TabsTrigger>
                  </TabsList>

                  <TabsContent value="invite">
                    <InviteCodeForm
                      inviteCode={inviteCode}
                      onInviteCodeChange={setInviteCode}
                      busy={busy}
                    />
                  </TabsContent>

                  <TabsContent value="email">
                    <EmailLoginForm
                      email={email}
                      onEmailChange={setEmail}
                      password={password}
                      onPasswordChange={setPassword}
                      busy={busy}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>

              <CardFooter className="flex-col gap-3 border-t bg-transparent p-6">
                <div className="flex w-full gap-3">
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
      <div className="max-w-xl">
        <h1 className="text-5xl font-bold tracking-tight text-foreground">
          <TypingAnimation as="span" startOnView={false}>
            Build your ideas.
          </TypingAnimation>
          <br />
          <TypingAnimation
            as="span"
            className="text-primary"
            delay={1200}
            startOnView={false}
          >
            {" Better than ever."}
          </TypingAnimation>
        </h1>

        <TextAnimate
          className="mt-6 max-w-md text-lg text-muted-foreground"
          animation="blurInUp"
          delay={2400}
          startOnView={false}
        >
          管理你的会议, 并与其他成员协作. 让模拟联合国会议的组织变得更简单,
          更高效.
        </TextAnimate>

        <div className="mt-10 flex gap-6 text-sm text-muted-foreground">
          <HeroStat label="会务管理" title="一站式" delay={3000} />
          <HeroStat label="局势同步" title="实时" delay={3300} />
          <HeroStat label="数字化管理" title="全流程" delay={3600} />
        </div>
      </div>
    </section>
  )
}

function HeroStat({
  label,
  title,
  delay,
}: {
  label: string
  title: string
  delay: number
}) {
  return (
    <div>
      <TextAnimate
        as="div"
        className="text-2xl font-bold text-foreground"
        animation="blurInUp"
        delay={delay}
        startOnView={false}
      >
        {title}
      </TextAnimate>
      <TextAnimate
        as="div"
        delay={delay + 150}
        startOnView={false}
      >
        {label}
      </TextAnimate>
    </div>
  )
}

function InviteCodeForm({
  inviteCode,
  onInviteCodeChange,
  busy,
}: {
  inviteCode: string
  onInviteCodeChange: (value: string) => void
  busy: boolean
}) {
  return (
    <form className="flex flex-col gap-4">
      <InputOTP
        maxLength={8}
        value={inviteCode}
        onChange={onInviteCodeChange}
        containerClassName="justify-center"
        aria-label="席位邀请码"
        pattern="^[A-HJ-NP-Za-hj-np-z2-9]+$"
      >
        <InputOTPGroup className="gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <InputOTPSlot
              key={index}
              index={index}
              className="h-12 w-10 rounded-lg border text-base font-mono uppercase"
            />
          ))}
        </InputOTPGroup>
        <InputOTPSeparator className="mx-1 text-muted-foreground" />
        <InputOTPGroup className="gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <InputOTPSlot
              key={index + 4}
              index={index + 4}
              className="h-12 w-10 rounded-lg border text-base font-mono uppercase"
            />
          ))}
        </InputOTPGroup>
      </InputOTP>
      <JoinButton disabled={busy || inviteCode.trim().length < 8} label="加入" />
    </form>
  )
}

function EmailLoginForm({
  email,
  onEmailChange,
  password,
  onPasswordChange,
  busy,
}: {
  email: string
  onEmailChange: (value: string) => void
  password: string
  onPasswordChange: (value: string) => void
  busy: boolean
}) {
  return (
    <form className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">邮箱</Label>
        <Input
          id="email"
          type="email"
          className="h-12"
          placeholder="name@example.com"
          autoComplete="email"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">密码</Label>
        <Input
          id="password"
          type="password"
          className="h-12"
          placeholder="密码"
          autoComplete="current-password"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
        />
      </div>
      <JoinButton
        disabled={busy || !email.trim() || !password.trim()}
        label="登录"
      />
    </form>
  )
}

function JoinButton({
  disabled,
  label,
}: {
  disabled: boolean
  label: string
}) {
  return (
    <Button type="submit" size="lg" disabled={disabled}>
      {disabled ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <LogIn className="size-4" />
      )}
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
