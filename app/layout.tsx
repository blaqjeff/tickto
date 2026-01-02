import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/layout/BottomNav";
import { GradientMesh } from "@/components/layout/GradientMesh";
import { PrivyWrapper } from "@/components/providers/PrivyWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tickto | Invisible Crypto Ticketing",
  description: "Premium event tickets powered by blockchain. Seamless, secure, and stunning.",
  keywords: ["tickets", "crypto", "NFT", "events", "blockchain"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <PrivyWrapper>
          <GradientMesh />
          <main className="safe-bottom min-h-screen">
            {children}
          </main>
          <BottomNav />
        </PrivyWrapper>
      </body>
    </html>
  );
}
