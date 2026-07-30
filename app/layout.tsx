import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-pp-loaded",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Remifi",
  description:
    "Remifi is an AI agent that lets users automate recurring payments and fund distributions. Funds split automatically from your policy. Perfect for payrolls, DAO treasury flows, bounty payouts, and subscriptions.",
  applicationName: "Remifi",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f6f7f4",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body className="font-pp antialiased">{children}</body>
    </html>
  );
}
