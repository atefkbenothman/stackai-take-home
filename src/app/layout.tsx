import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import Script from "next/script"
import Providers from "@/app/providers"
import { SelectionProvider } from "@/hooks/use-selection"
import { Toaster } from "sonner"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "StackAI Take Home - Kai",
  description: "StackAI Take Home",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-scan/dist/auto.global.js"
            strategy="beforeInteractive"
            crossOrigin="anonymous"
          />
        )}
        <Providers>
          <SelectionProvider>{children}</SelectionProvider>
        </Providers>
        <Toaster position="top-center" />
      </body>
    </html>
  )
}
