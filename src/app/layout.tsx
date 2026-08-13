import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, JetBrains_Mono, Source_Sans_3 } from "next/font/google";
import { AuthProvider } from "@/components/auth/AuthProvider";
import "./globals.css";

/** House pairing: docs/alyra-typography.md — Next vendors at build (no runtime Google CDN). */
const display = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
  adjustFontFallback: true,
});

/** Humanist UI — labels, buttons, body. Not Inter / DM Sans / Poppins. */
const sans = Source_Sans_3({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
  adjustFontFallback: true,
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  fallback: ["ui-monospace", "monospace"],
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: "Alyra Labs — Compose perfume on a chemistry desk",
  description:
    "The digital atelier for Alyra solid perfume. Pour notes, build formulas, and invent scents on a virtual chemistry desk. From the makers of alyra.in.",
  icons: {
    icon: "/alyra-logo.png",
    apple: "/alyra-logo.png",
  },
};

/** Phone must open at 1× — no accidental zoomed-in first paint. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#0c0c0c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable} h-full`}
    >
      <body className="min-h-full max-w-[100vw] overflow-x-hidden font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
