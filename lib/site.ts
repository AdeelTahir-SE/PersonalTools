export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://personal-tools.vercel.app"
).replace(/\/$/, "");

export const siteName = "Personal Tools";

export const siteDescription =
  "Free browser-based utilities for developers and designers: split grid images into individual sections, auto-detect and extract icons from transparent images, and more. No upload, no sign-up — everything runs locally in your browser.";

export interface ToolMeta {
  slug: string;
  name: string;
  title: string;
  description: string;
  keywords: string[];
}

export const toolsMeta: ToolMeta[] = [
  {
    slug: "grid-crop",
    name: "Grid Crop",
    title: "Grid Crop — Split Grid Images into Individual Sections Online",
    description:
      "Free online grid image splitter. Upload an image, place draggable grid lines and a crop region, and export every cell as a separate PNG — perfect for extracting icons from AI-generated 2×3 or 3×3 grids. Runs 100% in your browser.",
    keywords: [
      "grid crop",
      "split image grid",
      "image splitter online",
      "extract icons from grid",
      "crop image into pieces",
      "split sprite sheet",
      "ai icon grid splitter",
      "chatgpt icon grid extract",
    ],
  },
  {
    slug: "icon-extract",
    name: "Icon Extract",
    title: "Icon Extract — Automatically Extract Icons from an Image Online",
    description:
      "Free online icon extractor. Upload an image with a transparent background and icons are detected automatically — click any icon to save it as an individual PNG. No upload to a server, everything runs locally in your browser.",
    keywords: [
      "icon extractor",
      "extract icons from image",
      "auto detect icons",
      "split transparent png",
      "sprite extractor online",
      "separate icons from image",
      "png icon splitter",
    ],
  },
];
