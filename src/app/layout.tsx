import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Windows 98",
  description: "A nostalgic Windows 98 simulation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  );
}
