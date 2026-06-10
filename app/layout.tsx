import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from "@vercel/speed-insights/next"
import './globals.css'
import type { Viewport } from "next"
import { PageTransition } from "@/components/page-transition"
import { Toaster } from "sonner"

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'CycleGuard',
  description: 'Professional cycle tracking for serious athletes',
  generator: 'v0.app',
icons: {
  icon: "/favicon.ico",
  apple: "/apple-touch-icon.png",
},
manifest: "/manifest.json",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background">
      <body className="font-sans antialiased">
<PageTransition>{children}</PageTransition>
<Toaster
  position="top-center"
  richColors
  theme="dark"
/>
        {process.env.NODE_ENV === 'production' && <Analytics />}
        {process.env.NODE_ENV === 'production' && <SpeedInsights />}
      </body>
    </html>
  )
}
