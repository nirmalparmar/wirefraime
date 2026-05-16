import type { Metadata } from "next";
import { DM_Sans, Instrument_Serif } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/ThemeProvider";
import { GoogleAnalytics } from '@next/third-parties/google'
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

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://wirefraime.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Wirefraime — AI Wireframe & UI Design Tool",
    template: "%s — Wirefraime",
  },
  description:
    "Wirefraime is the AI wireframe tool that turns a prompt into a full UI design — every screen, every state, every flow. Your AI UI designer.",
  applicationName: "Wirefraime",
  keywords: [
    "wireframe",
    "wireframe tool",
    "wireframe tools",
    "AI wireframe",
    "AI wireframe tool",
    "wireframe mockup",
    "wireframe mock up",
    "AI UI design",
    "UI designer",
    "AI UI designer",
    "UI design tool",
    "UI mockup generator",
    "AI design tool",
    "AI app design",
    "design system generator",
    "Wirefraime",
  ],
  authors: [{ name: "Wirefraime" }],
  creator: "Wirefraime",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    title: "Wirefraime — AI Wireframe & UI Design Tool",
    description:
      "AI wireframe tool that turns a prompt into a full UI design. Generate wireframes, mockups, and every screen of your app — in seconds.",
    siteName: "Wirefraime",
  },
  twitter: {
    card: "summary_large_image",
    title: "Wirefraime — AI Wireframe & UI Design Tool",
    description:
      "AI wireframe tool that turns a prompt into a full UI design. Wireframes, mockups, every screen — in seconds.",
  },
  robots: { index: true, follow: true },
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
        <script type="text/javascript"
          dangerouslySetInnerHTML={{
            __html: `(function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "wfaa14evup");`
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
        <GoogleAnalytics gaId="G-THR3PQGCT7" />
      </body>
    </html>
  );
}
