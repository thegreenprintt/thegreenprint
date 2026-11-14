import type { Metadata, Viewport } from "next";
import StyledJsxRegistry from "./StyleRegistry";

export const metadata: Metadata = {
  title: "Greenprint AI",
  description: "The Greenprint AI. Build websites, break down trades, write content, and talk it through.",
  manifest: "/ai.webmanifest",
  appleWebApp: { capable: true, title: "Greenprint AI", statusBarStyle: "black-translucent" },
  icons: { icon: "/ai-icon-192.png", apple: "/ai-apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#060806",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function AILayout({ children }: { children: React.ReactNode }) {
  return <StyledJsxRegistry>{children}</StyledJsxRegistry>;
}
