"use client"

import { AtSign, Loader2, UserRound } from "lucide-react"

import { PlatformLoading, PlatformShell } from "@/components/platform-shell"
import { UserAvatar } from "@/components/user-avatar"
import { Card, CardContent } from "@/components/ui/card"
import { TextAnimate } from "@/components/ui/text-animate"
import type { PlatformUser } from "@/lib/auth-client"
import { usePlatformAuth } from "@/lib/use-platform-auth"
import { usePlatformUser } from "@/lib/use-platform-user"

export default function AccountPage() {
  const { token, isReady, signOut } = usePlatformAuth()
  const { user, error } = usePlatformUser(token, signOut)

  if (!isReady) return <PlatformLoading />

  return (
    <PlatformShell backHref="/" backLabel="返回大会列表">
      <section className="border-b pb-10">
        <TextAnimate
          as="h1"
          animation="blurInUp"
          by="word"
          className="platform-title text-4xl font-bold tracking-[-0.04em] text-balance sm:text-5xl"
        >
          个人中心
        </TextAnimate>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          查看你的 Veto 组织者账号信息。
        </p>
      </section>

      <section className="pt-10">
        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
          >
            {error}
          </div>
        ) : user ? (
          <UserCard user={user} />
        ) : (
          <Card className="bg-card/70 shadow-none ring-0">
            <CardContent className="grid place-items-center py-20">
              <Loader2
                className="animate-spin text-muted-foreground"
                aria-label="正在加载用户信息"
              />
            </CardContent>
          </Card>
        )}
      </section>
    </PlatformShell>
  )
}

function UserCard({ user }: { user: PlatformUser }) {
  return (
    <Card className="bg-card/70 shadow-none ring-0">
      <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:gap-8 sm:p-8">
        <UserAvatar
          name={user.name}
          avatar={user.avatar || undefined}
          className="size-20 text-2xl"
        />
        <div className="min-w-0 space-y-3">
          <div className="flex items-center gap-2.5">
            <UserRound
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="min-w-0 truncate text-xl font-semibold tracking-tight">
              {user.name || "未设置姓名"}
            </p>
          </div>
          <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <AtSign className="size-4 shrink-0" aria-hidden="true" />
            <p className="min-w-0 truncate">{user.email}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
