import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
