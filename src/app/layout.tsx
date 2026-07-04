import type { Metadata, Viewport } from "next";
import "./globals.css";
import { MobileGate } from "@/components/system/MobileGate";

export const metadata: Metadata = {
  title: "Windows 98",
  description: "A nostalgic Windows 98 simulation",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full overflow-hidden">
        {children}
        <MobileGate />
      </body>
    </html>
  );
}
