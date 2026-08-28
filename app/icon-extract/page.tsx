import type { Metadata } from "next";
import IconExtractTool from "@/components/IconExtractTool";
import { siteUrl, siteName, toolsMeta } from "@/lib/site";

const tool = toolsMeta.find((t) => t.slug === "icon-extract")!;

export const metadata: Metadata = {
  title: tool.title,
  description: tool.description,
  keywords: tool.keywords,
  alternates: {
    canonical: "/icon-extract",
  },
  openGraph: {
    type: "website",
    url: `${siteUrl}/icon-extract`,
    siteName,
    title: tool.title,
    description: tool.description,
    images: [{ url: "/logo.png", width: 327, height: 290, alt: tool.name }],
  },
  twitter: {
    card: "summary",
    title: tool.title,
    description: tool.description,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: tool.name,
  url: `${siteUrl}/icon-extract`,
  description: tool.description,
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Any",
  browserRequirements: "Requires JavaScript",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  featureList: [
    "Automatic icon detection via alpha-channel analysis",
    "Adjustable merge distance, minimum size, and padding",
    "Click any detected icon to save it as PNG",
    "Download all extracted icons at once",
    "Runs entirely in the browser — images never leave your machine",
  ],
};

export default function IconExtractPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <IconExtractTool />
    </>
  );
}
