import type { Metadata } from "next";
import "./globals.css";
import { DisclaimerBar } from "@/components/ui/DisclaimerBar";

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
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-bg text-text font-sans antialiased min-h-screen">
        {children}
        <DisclaimerBar />
      </body>
    </html>
  );
}
