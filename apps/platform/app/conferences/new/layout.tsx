import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "创建大会",
}

export default function NewConferenceLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}
