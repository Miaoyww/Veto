import type { Metadata } from "next"

import { siteName } from "@/lib/site"

export const metadata: Metadata = {
  title: {
    default: "大会管理",
    template: `%s | ${siteName}`,
  },
  robots: {
    index: false,
    follow: false,
  },
}

export default function ConferencesLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}
