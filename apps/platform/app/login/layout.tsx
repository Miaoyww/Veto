import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "登录",
  description: "登录云Veto 组织者平台，创建和管理你的云端大会。",
}

export default function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}
