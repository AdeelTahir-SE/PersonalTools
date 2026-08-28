import type { Metadata } from "next";
import GridCropTool from "@/components/GridCropTool";
import { siteUrl, siteName, toolsMeta } from "@/lib/site";

const tool = toolsMeta.find((t) => t.slug === "grid-crop")!;

export const metadata: Metadata = {
  title: tool.title,
  description: tool.description,
  keywords: tool.keywords,
  alternates: {
    canonical: "/grid-crop",
  },
  openGraph: {
    type: "website",
    url: `${siteUrl}/grid-crop`,
    siteName,
    title: tool.title,
    description: tool.description,
    images: [{ url: "/logo.png", width: 512, height: 512, alt: tool.name }],
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
  url: `${siteUrl}/grid-crop`,
  description: tool.description,
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Any",
  browserRequirements: "Requires JavaScript",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  featureList: [
    "Draggable horizontal and vertical grid lines",
    "Adjustable crop region",
    "Real-time preview of every section",
    "Export all sections as individual PNG files",
    "Runs entirely in the browser — images never leave your machine",
  ],
};

export default function GridCropPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <GridCropTool />
    </>
  );
}
