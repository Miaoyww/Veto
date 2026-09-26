import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "账号",
  robots: {
    index: false,
    follow: false,
  },
}

export default function AccountLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}
