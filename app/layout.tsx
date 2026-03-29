import type { Metadata } from "next";
import { DM_Sans, Instrument_Serif } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Wirefraime — Full App Design, End-to-End",
  description:
    "Describe your app once. Wirefraime's AI understands your product and generates every screen, every flow, every edge case — fully designed in seconds.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={dmSans.variable} suppressHydrationWarning>
      <head>
        {/* Anti-flash: apply dark class before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('wf-theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark')})()`,
          }}
        />
      </head>
      <body className={`${instrumentSerif.variable} ${dmSans.variable} antialiased`}>
        <ClerkProvider
          appearance={{
            baseTheme: undefined,
            variables: {
              colorPrimary: "oklch(0.58 0.11 38)",
              fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
              borderRadius: "0.45rem",
            },
          }}
          afterSignOutUrl="/"
        >
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
