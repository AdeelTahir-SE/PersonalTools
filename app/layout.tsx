import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { siteUrl, siteName, siteDescription, toolsMeta } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} — Free Online Utilities for Developers`,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  keywords: [
    "free online tools",
    "developer tools",
    "image tools online",
    "grid crop",
    "icon extractor",
    "browser based tools",
    "no upload image tools",
  ],
  applicationName: siteName,
  authors: [{ name: "Adeel Tahir", url: "https://github.com/AdeelTahir-SE" }],
  creator: "Adeel Tahir",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName,
    title: `${siteName} — Free Online Utilities for Developers`,
    description: siteDescription,
    images: [
      {
        url: "/logo.png",
        width: 327,
        height: 290,
        alt: `${siteName} logo`,
      },
    ],
  },
  twitter: {
    card: "summary",
    title: `${siteName} — Free Online Utilities for Developers`,
    description: siteDescription,
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "technology",
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: siteName,
  url: siteUrl,
  description: siteDescription,
  publisher: {
    "@type": "Person",
    name: "Adeel Tahir",
    url: "https://github.com/AdeelTahir-SE",
  },
  hasPart: toolsMeta.map((tool) => ({
    "@type": "WebApplication",
    name: tool.name,
    url: `${siteUrl}/${tool.slug}`,
    description: tool.description,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  })),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <meta
          name="google-site-verification"
          content="MQZOMrHjT4vuDeii8jZcMN48drxQ7sGqvgh4RNXkG_g"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <ThemeProvider>{children}</ThemeProvider>
        <footer className="border-t border-card-border">
          <div className="w-full max-w-5xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-muted">
              {siteName} — free, browser-based tools.
            </p>
            <a
              href="https://github.com/AdeelTahir-SE"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-muted hover:text-foreground transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.72.5.1.68-.22.68-.49 0-.24-.01-.88-.01-1.72-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.63.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.89 1.57 2.34 1.12 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.7 0 0 .84-.28 2.75 1.05a9.36 9.36 0 0 1 2.5-.35c.85 0 1.71.12 2.5.35 1.91-1.33 2.75-1.05 2.75-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.6.69.49A10.25 10.25 0 0 0 22 12.25C22 6.58 17.52 2 12 2z" />
              </svg>
              github.com/AdeelTahir-SE
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
