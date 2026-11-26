import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SWProvider } from "@/components/providers/sw-provider";
import { OfflineOverlay } from "@/components/providers/offline-overlay";
import Image from "next/image";
import { SplashDismiss } from "@/components/providers/splash-dismiss";
import { splashStartupImages } from "@/lib/pwa/splash";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Panthar Teams — Team Operations Platform",
  description: "Enterprise-grade team operations platform for engineering, product, and design teams.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Panthar",
    startupImage: splashStartupImages,
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  // Lets the bottom bar sit above the iPhone home indicator (safe-area insets).
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground">
        {/* Launch screen for the installed app, in the static shell so it shows
            with the first bytes; SplashDismiss hides it once the app is running. */}
        <div id="app-splash" aria-hidden="true">
          <Image src="/images/black_logo.webp" alt="" width={88} height={88} priority />
        </div>
        <ClerkProvider>
          <ThemeProvider>
            <SWProvider />
            <SplashDismiss />
            <OfflineOverlay />
            {children}
            <Toaster />
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
