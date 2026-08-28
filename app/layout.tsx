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
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
