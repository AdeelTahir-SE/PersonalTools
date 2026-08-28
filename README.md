<p align="center">
  <img src="public/logo.png" alt="Personal Tools logo" width="96" />
</p>

<h1 align="center">Personal Tools</h1>

<p align="center">
  Free, browser-based utilities for developers and designers.<br/>
  All processing happens locally in your browser 
</p>

<p align="center">
  <a href="https://personal-tools.vercel.app"><strong>personal-tools.vercel.app</strong></a>
</p>

---

## Tools

### 🔲 Grid Crop — [`/grid-crop`](https://personal-tools.vercel.app/grid-crop)

Split a grid image into individual sections.

- Drag horizontal and vertical grid lines anywhere on the image, or type exact positions
- Optionally set a crop region — only the area inside it is exported (WYSIWYG)
- Live preview of every section with pixel sizes
- Export all cells as individual PNGs, auto-named `image_1.png` … `image_n.png`

Perfect for extracting icons from AI-generated icon grids (e.g. 2×3 or 3×3 layouts from ChatGPT / Midjourney) or slicing sprite sheets.

### ✂️ Icon Extract — [`/icon-extract`](https://personal-tools.vercel.app/icon-extract)

Automatically detect and extract icons from an image.

- Upload an image with a transparent background — icons are found automatically via alpha-channel connected-component analysis
- Also works on opaque images (background color is auto-sampled from the corners)
- Tune detection with **merge distance**, **min icon size**, and **padding** sliders — results update in real time
- Click any detected icon (on the image or in the preview list) to save it as PNG, or download all at once

### Many More — [`/`](https://personal-tools.vercel.app/)

## Highlights

- 🔒 **Private by design** — everything runs client-side with the Canvas API; no uploads, no server, no tracking
- 🌗 Light / dark theme with system preference detection
- ⚡ Real-time, debounced previews — no "apply" button needed
- 🔍 SEO-ready: per-tool metadata, JSON-LD structured data, `sitemap.xml`, `robots.txt`, and `llms.txt`

## Tech Stack

| | |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router, Turbopack) |
| UI | [React 19](https://react.dev) + [Tailwind CSS v4](https://tailwindcss.com) |
| Language | TypeScript |
| Image processing | HTML Canvas API (fully client-side) |

## Getting Started

```bash
# install dependencies
npm install

# start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Other scripts

```bash
npm run build   # production build
npm run start   # serve the production build
npm run lint    # lint with ESLint
```

### Configuration

| Env var | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://personal-tools.vercel.app` | Canonical site URL used in metadata, `sitemap.xml`, and `robots.txt` |

## Project Structure

```
app/
  page.tsx              # All Tools home page (searchable tool grid)
  layout.tsx            # Root layout: theme, SEO metadata, JSON-LD, footer
  grid-crop/page.tsx    # Grid Crop route + per-tool metadata
  icon-extract/page.tsx # Icon Extract route + per-tool metadata
  sitemap.ts            # /sitemap.xml
  robots.ts             # /robots.txt
components/
  GridCropTool.tsx      # Grid Crop editor (draggable lines, crop region, export)
  IconExtractTool.tsx   # Icon Extract editor (auto-detection, tuning, export)
context/
  ThemeContext.tsx      # Light/dark theme provider (localStorage + system pref)
lib/
  site.ts               # Site URL, name, and per-tool SEO registry
public/
  llms.txt              # Site description for AI assistants/crawlers
```

Adding a new tool: create `components/<Tool>.tsx` and `app/<slug>/page.tsx`, add a card in `app/page.tsx`, and register it in `lib/site.ts` — the sitemap and structured data pick it up automatically.

## Author

**Adeel Tahir** — [github.com/AdeelTahir-SE](https://github.com/AdeelTahir-SE)
