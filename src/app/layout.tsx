import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { OfflineIndicator } from "@/components/offline-indicator";
import { PwaRegister } from "@/components/pwa-register";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "Adventify - Global Baptism Certificate Platform",
  description: "Securely manage, generate, and verify baptism certificates for the Seventh-day Adventist Church hierarchy.",
  keywords: ["Adventify", "Baptism Certificate", "SDA", "Seventh-day Adventist", "Church Management"],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Adventify - Global Baptism Certificate Platform",
    description: "Securely manage, generate, and verify baptism certificates for the Seventh-day Adventist Church.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Adventify - Global Baptism Certificate Platform",
    description: "Securely manage, generate, and verify baptism certificates for the Seventh-day Adventist Church.",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Adventify",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Adventify" />
        <meta name="theme-color" content="#059669" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <OfflineIndicator />
        {children}
        <PwaInstallPrompt />
        <Toaster />
        <PwaRegister />
      </body>
    </html>
  );
}
