import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DRIP — your personal fashion search",
  description:
    "An AI-powered personal stylist. Search real clothing from major shops, filtered to your size, style, and budget.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-canvas font-sans text-ink">
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
