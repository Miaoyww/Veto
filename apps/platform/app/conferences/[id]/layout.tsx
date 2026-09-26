import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "大会详情",
}

export default function ConferenceLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}
