import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { DisclaimerBar } from "@/components/ui/DisclaimerBar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  preload: false,
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "The Greenprint — Trading Education Platform",
  description: "Day trading, investing, and commercial real estate. The strategies and systems that create generational wealth.",
  keywords: "trading education, day trading, investing, commercial real estate, mentorship",
  openGraph: {
    title: "The Greenprint",
    description: "Build Wealth. Own Your Future.",
    url: "https://thegreenprint.trade",
    siteName: "The Greenprint",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-bg text-text font-sans antialiased min-h-screen">
        {children}
        <DisclaimerBar />
      </body>
    </html>
  );
}
