import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SIF Super Control Dashboard",
  description: "ASLF-OSINT super control plane dashboard"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
