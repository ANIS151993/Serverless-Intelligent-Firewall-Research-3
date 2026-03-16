import type { Metadata } from "next";
import Script from "next/script";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ASLF-OSINT Platform",
    template: "%s | ASLF-OSINT",
  },
  description: "Autonomous Serverless Intelligent Firewall control dashboards",
};

const themeBootScript = `
  try {
    var stored = localStorage.getItem("sif-theme");
    var preferred = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    document.documentElement.dataset.theme = stored || preferred;
  } catch (error) {
    document.documentElement.dataset.theme = "dark";
  }
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <body>
        <Script id="theme-boot" strategy="beforeInteractive">
          {themeBootScript}
        </Script>
        {children}
      </body>
    </html>
  );
}
