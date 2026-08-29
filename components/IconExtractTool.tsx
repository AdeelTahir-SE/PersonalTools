"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "@/context/ThemeContext";

interface DetectedIcon {
  id: number;
  // bounding box in natural image pixels
  x: number;
  y: number;
  w: number;
  h: number;
  dataUrl: string;
  label: string;
}

const MAX_DETECT_PIXELS = 4_000_000; // downscale detection above this many pixels
const ALPHA_THRESHOLD = 16;
const COLOR_TOLERANCE_SQ = 40 * 40; // for opaque images: distance from corner bg color

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center border border-card-border bg-card-bg hover:bg-card-border transition-colors cursor-pointer"
      aria-label="Toggle theme"
    >
      {theme === "light" ? (
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  count: number;
}

/** Build a foreground mask: alpha channel if present, otherwise distance from corner background color. */
function buildForegroundMask(data: Uint8ClampedArray, w: number, h: number): { mask: Uint8Array; usedAlpha: boolean } {
  const n = w * h;
  const mask = new Uint8Array(n);

  let hasAlpha = false;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 250) {
      hasAlpha = true;
      break;
    }
  }

  if (hasAlpha) {
    for (let p = 0; p < n; p++) {
      if (data[p * 4 + 3] > ALPHA_THRESHOLD) mask[p] = 1;
    }
    return { mask, usedAlpha: true };
  }

  // Opaque image: estimate background color from the four corners
  const corners = [0, w - 1, (h - 1) * w, h * w - 1];
  let br = 0,
    bg = 0,
    bb = 0;
  for (const c of corners) {
    br += data[c * 4];
    bg += data[c * 4 + 1];
    bb += data[c * 4 + 2];
  }
  br /= 4;
  bg /= 4;
  bb /= 4;

  for (let p = 0; p < n; p++) {
    const dr = data[p * 4] - br;
    const dg = data[p * 4 + 1] - bg;
    const db = data[p * 4 + 2] - bb;
    if (dr * dr + dg * dg + db * db > COLOR_TOLERANCE_SQ) mask[p] = 1;
  }
  return { mask, usedAlpha: false };
}

/** Connected components (8-connectivity) via iterative flood fill. */
function findComponents(mask: Uint8Array, w: number, h: number): Box[] {
  const visited = new Uint8Array(w * h);
  const boxes: Box[] = [];
  const stack = new Int32Array(w * h);

  for (let start = 0; start < w * h; start++) {
    if (!mask[start] || visited[start]) continue;

    let sp = 0;
    stack[sp++] = start;
    visited[start] = 1;
    const box: Box = {
      minX: start % w,
      minY: (start / w) | 0,
      maxX: start % w,
      maxY: (start / w) | 0,
      count: 0,
    };

    while (sp > 0) {
      const p = stack[--sp];
      const px = p % w;
      const py = (p / w) | 0;
      box.count++;
      if (px < box.minX) box.minX = px;
      if (px > box.maxX) box.maxX = px;
      if (py < box.minY) box.minY = py;
      if (py > box.maxY) box.maxY = py;

      for (let dy = -1; dy <= 1; dy++) {
        const ny = py + dy;
        if (ny < 0 || ny >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = px + dx;
          if (nx < 0 || nx >= w) continue;
          const np = ny * w + nx;
          if (mask[np] && !visited[np]) {
            visited[np] = 1;
            stack[sp++] = np;
          }
        }
      }
    }
    boxes.push(box);
  }
  return boxes;
}

/** Merge boxes whose bounds (expanded by gap) intersect, until stable. */
function mergeBoxes(boxes: Box[], gap: number): Box[] {
  const list = boxes.map((b) => ({ ...b }));
  let merged = true;
  while (merged) {
    merged = false;
    outer: for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (
          a.minX - gap <= b.maxX &&
          a.maxX + gap >= b.minX &&
          a.minY - gap <= b.maxY &&
          a.maxY + gap >= b.minY
        ) {
          a.minX = Math.min(a.minX, b.minX);
          a.minY = Math.min(a.minY, b.minY);
          a.maxX = Math.max(a.maxX, b.maxX);
          a.maxY = Math.max(a.maxY, b.maxY);
          a.count += b.count;
          list.splice(j, 1);
          merged = true;
          break outer;
        }
      }
    }
  }
  return list;
}

/** Sort boxes into reading order: rows top-to-bottom, then left-to-right. */
function sortReadingOrder(boxes: Box[]): Box[] {
  if (boxes.length === 0) return boxes;
  const sorted = [...boxes].sort(
    (a, b) => (a.minY + a.maxY) / 2 - (b.minY + b.maxY) / 2
  );
  const avgH =
    sorted.reduce((s, b) => s + (b.maxY - b.minY + 1), 0) / sorted.length;
  const rows: Box[][] = [];
  for (const box of sorted) {
    const cy = (box.minY + box.maxY) / 2;
    const row = rows.find((r) => {
      const rcy =
        r.reduce((s, b) => s + (b.minY + b.maxY) / 2, 0) / r.length;
      return Math.abs(cy - rcy) < avgH * 0.6;
    });
    if (row) row.push(box);
    else rows.push([box]);
  }
  const result: Box[] = [];
  for (const row of rows) {
    row.sort((a, b) => (a.minX + a.maxX) / 2 - (b.minX + b.maxX) / 2);
    result.push(...row);
  }
  return result;
}

export default function IconExtractTool() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [icons, setIcons] = useState<DetectedIcon[]>([]);
  const [usedAlpha, setUsedAlpha] = useState(true);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  // Detection settings
  const [minSize, setMinSize] = useState(12); // px: boxes smaller than this in both dimensions are noise
  const [mergeGap, setMergeGap] = useState(12); // px: parts closer than this are one icon
  const [padding, setPadding] = useState(6); // px added around each icon

  // Background removal
  const [bgTolerance, setBgTolerance] = useState(40);
  const [originalSrc, setOriginalSrc] = useState<string | null>(null);

  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [loadTick, setLoadTick] = useState(0);

  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- File handling ---
  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageSrc(e.target?.result as string);
      setIcons([]);
      setOriginalSrc(null);
      setNaturalSize({ w: 0, h: 0 });
    };
    reader.readAsDataURL(file);
  }, []);

  const handleImageLoad = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    setLoadTick((t) => t + 1);
  }, []);

  // --- Background removal (flood fill from the borders) ---
  const removeBackground = useCallback(() => {
    const img = imgRef.current;
    if (!img || !img.naturalWidth || !imageSrc) return;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;

    const canvas = document.createElement("canvas");
    canvas.width = nw;
    canvas.height = nh;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, nw, nh);
    const data = imageData.data;

    // Background color from the four corners
    const corners = [0, nw - 1, (nh - 1) * nw, nw * nh - 1];
    let br = 0,
      bg = 0,
      bb = 0;
    for (const c of corners) {
      br += data[c * 4];
      bg += data[c * 4 + 1];
      bb += data[c * 4 + 2];
    }
    br /= 4;
    bg /= 4;
    bb /= 4;
    const tolSq = bgTolerance * bgTolerance;

    const isBg = (p: number) => {
      const dr = data[p * 4] - br;
      const dg = data[p * 4 + 1] - bg;
      const db = data[p * 4 + 2] - bb;
      return dr * dr + dg * dg + db * db <= tolSq;
    };

    // Flood fill from the borders so same-colored pixels inside icons survive
    const visited = new Uint8Array(nw * nh);
    const stack = new Int32Array(nw * nh);
    let sp = 0;
    const push = (p: number) => {
      if (!visited[p] && isBg(p)) {
        visited[p] = 1;
        stack[sp++] = p;
      }
    };
    for (let x = 0; x < nw; x++) {
      push(x);
      push((nh - 1) * nw + x);
    }
    for (let y = 0; y < nh; y++) {
      push(y * nw);
      push(y * nw + nw - 1);
    }

    while (sp > 0) {
      const p = stack[--sp];
      const px = p % nw;
      const py = (p / nw) | 0;
      data[p * 4 + 3] = 0;
      if (px > 0) push(p - 1);
      if (px < nw - 1) push(p + 1);
      if (py > 0) push(p - nw);
      if (py < nh - 1) push(p + nw);
    }

    ctx.putImageData(imageData, 0, 0);
    setOriginalSrc((prev) => prev ?? imageSrc);
    setImageSrc(canvas.toDataURL("image/png"));
    setIcons([]);
  }, [imageSrc, bgTolerance]);

  const restoreOriginal = useCallback(() => {
    if (!originalSrc) return;
    setImageSrc(originalSrc);
    setOriginalSrc(null);
    setIcons([]);
  }, [originalSrc]);

  // --- Detection + extraction ---
  const detect = useCallback(() => {
    const img = imgRef.current;
    if (!img || !img.naturalWidth) return;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;

    setIsDetecting(true);
    try {
      // Downscale detection for very large images
      const scale = Math.min(1, Math.sqrt(MAX_DETECT_PIXELS / (nw * nh)));
      const dw = Math.max(1, Math.round(nw * scale));
      const dh = Math.max(1, Math.round(nh * scale));

      const detectCanvas = document.createElement("canvas");
      detectCanvas.width = dw;
      detectCanvas.height = dh;
      const dctx = detectCanvas.getContext("2d", { willReadFrequently: true })!;
      dctx.drawImage(img, 0, 0, dw, dh);
      const imageData = dctx.getImageData(0, 0, dw, dh);

      const { mask, usedAlpha: alpha } = buildForegroundMask(imageData.data, dw, dh);
      setUsedAlpha(alpha);

      let boxes = findComponents(mask, dw, dh);

      // Drop obvious noise before merging (speeds up O(n^2) merge)
      boxes = boxes.filter((b) => b.count >= 4);
      boxes = mergeBoxes(boxes, Math.max(1, Math.round(mergeGap * scale)));

      // Scale back to natural pixels + filter by min size
      const minDim = minSize;
      let full = boxes.map((b) => ({
        minX: Math.floor(b.minX / scale),
        minY: Math.floor(b.minY / scale),
        maxX: Math.ceil(b.maxX / scale),
        maxY: Math.ceil(b.maxY / scale),
        count: b.count,
      }));
      full = full.filter(
        (b) => b.maxX - b.minX + 1 >= minDim || b.maxY - b.minY + 1 >= minDim
      );
      // Ignore a single box covering nearly the whole image (bg detection failed)
      full = full.filter(
        (b) =>
          !(
            b.maxX - b.minX + 1 > nw * 0.98 &&
            b.maxY - b.minY + 1 > nh * 0.98 &&
            boxes.length === 1
          )
      );
      full = sortReadingOrder(full);

      // Extract each icon at full resolution
      const srcCanvas = document.createElement("canvas");
      srcCanvas.width = nw;
      srcCanvas.height = nh;
      srcCanvas.getContext("2d")!.drawImage(img, 0, 0);

      const baseName = imageFile?.name.replace(/\.[^.]+$/, "") || "icon";
      const results: DetectedIcon[] = [];
      full.forEach((b, i) => {
        const x = Math.max(0, b.minX - padding);
        const y = Math.max(0, b.minY - padding);
        const w = Math.min(nw, b.maxX + 1 + padding) - x;
        const h = Math.min(nh, b.maxY + 1 + padding) - y;
        if (w <= 0 || h <= 0) return;

        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        c.getContext("2d")!.drawImage(srcCanvas, x, y, w, h, 0, 0, w, h);
        results.push({
          id: i + 1,
          x,
          y,
          w,
          h,
          dataUrl: c.toDataURL("image/png"),
          label: `${baseName}_${i + 1}.png`,
        });
      });
      setIcons(results);
    } finally {
      setIsDetecting(false);
    }
  }, [imageFile, minSize, mergeGap, padding]);

  // Auto-detect (debounced) whenever the image loads or settings change
  useEffect(() => {
    if (!imageSrc || naturalSize.w === 0) return;
    const timer = setTimeout(detect, 250);
    return () => clearTimeout(timer);
  }, [imageSrc, naturalSize.w, loadTick, detect]);

  const downloadIcon = useCallback((icon: DetectedIcon) => {
    const a = document.createElement("a");
    a.href = icon.dataUrl;
    a.download = icon.label;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  const downloadAll = useCallback(() => {
    icons.forEach((icon, i) => {
      setTimeout(() => downloadIcon(icon), i * 200);
    });
  }, [icons, downloadIcon]);

  const reset = useCallback(() => {
    setImageSrc(null);
    setImageFile(null);
    setIcons([]);
    setOriginalSrc(null);
    setNaturalSize({ w: 0, h: 0 });
  }, []);

  // ===================== UPLOAD STATE =====================
  if (!imageSrc) {
    return (
      <div className="flex flex-col flex-1 bg-background min-h-screen">
        <div className="w-full max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center border border-card-border bg-card-bg hover:bg-card-border transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5" />
                  <path d="M12 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Icon Extract</h1>
                <p className="text-sm text-muted">Automatically detect and extract icons from a transparent image.</p>
              </div>
            </div>
            <ThemeToggle />
          </div>

          <div
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingOver(false);
              const file = e.dataTransfer.files[0];
              if (file) handleFile(file);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingOver(true);
            }}
            onDragLeave={() => setIsDraggingOver(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-24 flex flex-col items-center justify-center cursor-pointer transition-all ${
              isDraggingOver
                ? "border-foreground bg-card-bg"
                : "border-card-border hover:border-foreground/40 hover:bg-card-bg/50"
            }`}
          >
            <svg viewBox="0 0 48 48" fill="none" className="w-16 h-16 mb-4 text-muted" stroke="currentColor" strokeWidth="1.5">
              <rect x="6" y="6" width="14" height="14" rx="3" />
              <circle cx="35" cy="13" r="7" />
              <path d="M6 42 L13 28 L20 42 Z" />
              <rect x="28" y="28" width="14" height="14" rx="7" strokeDasharray="3 3" />
            </svg>
            <p className="text-lg font-medium mb-1">Drop an image with icons here</p>
            <p className="text-sm text-muted">Transparent background works best · or click to browse</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // ===================== EDITOR STATE =====================
  return (
    <div className="flex flex-col flex-1 bg-background min-h-screen">
      {/* Top bar */}
      <div className="border-b border-card-border">
        <div className="w-full max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center border border-card-border bg-card-bg hover:bg-card-border transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-lg font-bold tracking-tight">Icon Extract</h1>
            <span className="text-xs text-muted hidden sm:inline">
              {icons.length} icon{icons.length === 1 ? "" : "s"} detected
              {naturalSize.w > 0 && ` · ${naturalSize.w}×${naturalSize.h}px`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={reset}
              className="px-4 py-2 rounded-lg border border-card-border bg-card-bg font-medium text-xs hover:bg-card-border transition-colors cursor-pointer"
            >
              New Image
            </button>
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="flex-1 w-full max-w-[1600px] mx-auto px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* ========== LEFT PANEL: Detection settings ========== */}
          <div className="w-full lg:w-60 shrink-0 flex flex-col gap-4 lg:sticky lg:top-6 order-2 lg:order-1">
            <div className="rounded-xl border border-card-border bg-card-bg p-3">
              <h3 className="font-semibold text-xs uppercase tracking-wide text-muted mb-3">Detection</h3>

              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-muted">Merge distance</label>
                  <span className="text-[11px] font-mono">{mergeGap}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={80}
                  value={mergeGap}
                  onChange={(e) => setMergeGap(Number(e.target.value))}
                  className="w-full accent-foreground"
                />
                <p className="text-[10px] text-muted mt-0.5">
                  Parts closer than this count as one icon.
                </p>
              </div>

              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-muted">Min icon size</label>
                  <span className="text-[11px] font-mono">{minSize}px</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={100}
                  value={minSize}
                  onChange={(e) => setMinSize(Number(e.target.value))}
                  className="w-full accent-foreground"
                />
                <p className="text-[10px] text-muted mt-0.5">
                  Smaller detections are ignored as noise.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-muted">Padding</label>
                  <span className="text-[11px] font-mono">{padding}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={40}
                  value={padding}
                  onChange={(e) => setPadding(Number(e.target.value))}
                  className="w-full accent-foreground"
                />
                <p className="text-[10px] text-muted mt-0.5">
                  Extra space added around each icon.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-card-border bg-card-bg p-3">
              <h3 className="font-semibold text-xs uppercase tracking-wide text-muted mb-2">Background</h3>
              <p className="text-[11px] font-mono">
                {usedAlpha ? "Transparent (alpha)" : "Solid color (auto)"}
              </p>
              <p className="text-[10px] text-muted mt-1">
                {usedAlpha
                  ? "Icons found from non-transparent pixels."
                  : "No alpha channel — background color sampled from corners."}
              </p>

              {!usedAlpha && (
                <div className="mt-3 pt-3 border-t border-card-border">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] text-muted">Tolerance</label>
                    <span className="text-[11px] font-mono">{bgTolerance}</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={120}
                    value={bgTolerance}
                    onChange={(e) => setBgTolerance(Number(e.target.value))}
                    className="w-full accent-foreground"
                  />
                  <button
                    onClick={removeBackground}
                    className="w-full mt-2 py-2 rounded-lg bg-foreground text-background font-semibold text-xs hover:opacity-85 transition-opacity cursor-pointer"
                  >
                    Remove Background
                  </button>
                  <p className="text-[10px] text-muted mt-1.5">
                    Makes the background transparent before detection. Higher tolerance removes more.
                  </p>
                </div>
              )}

              {originalSrc && (
                <button
                  onClick={restoreOriginal}
                  className="w-full mt-3 py-2 rounded-lg border border-card-border bg-background font-medium text-xs hover:bg-card-border transition-colors cursor-pointer"
                >
                  Restore Original
                </button>
              )}
            </div>

            <p className="text-[11px] text-muted px-1">
              Click an icon on the image or in the list to save it.
            </p>
          </div>

          {/* ========== CENTER: Image with detected boxes ========== */}
          <div className="flex-1 min-w-0 flex justify-center order-1 lg:order-2">
            <div className="relative inline-block select-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Uploaded"
                onLoad={handleImageLoad}
                className="max-w-full h-auto rounded-lg block border border-card-border bg-[repeating-conic-gradient(#e5e5e5_0%_25%,#fff_0%_50%)] bg-size-[16px_16px] dark:bg-[repeating-conic-gradient(#333_0%_25%,#1a1a1a_0%_50%)] dark:bg-size-[16px_16px]"
                style={{ maxHeight: "78vh" }}
                draggable={false}
              />

              {naturalSize.w > 0 &&
                icons.map((icon) => (
                  <div
                    key={icon.id}
                    onClick={() => downloadIcon(icon)}
                    onMouseEnter={() => setHoveredId(icon.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className="absolute cursor-pointer group"
                    title={`Save ${icon.label}`}
                    style={{
                      left: `${(icon.x / naturalSize.w) * 100}%`,
                      top: `${(icon.y / naturalSize.h) * 100}%`,
                      width: `${(icon.w / naturalSize.w) * 100}%`,
                      height: `${(icon.h / naturalSize.h) * 100}%`,
                      border: hoveredId === icon.id ? "2px solid #fff" : "1px solid #fff",
                      boxShadow: "0 0 0 1px rgba(0,0,0,0.65)",
                      backgroundColor:
                        hoveredId === icon.id ? "rgba(255,255,255,0.15)" : "transparent",
                      borderRadius: 4,
                      transition: "background-color 120ms",
                    }}
                  >
                    <span
                      className="absolute -top-2 -left-2 min-w-5 h-5 px-1 rounded-full flex items-center justify-center text-[10px] font-bold font-mono"
                      style={{
                        backgroundColor: hoveredId === icon.id ? "#fff" : "#000",
                        color: hoveredId === icon.id ? "#000" : "#fff",
                        boxShadow: "0 0 0 1px rgba(255,255,255,0.65)",
                      }}
                    >
                      {icon.id}
                    </span>
                    <span
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white" stroke="currentColor" strokeWidth="2" style={{ filter: "drop-shadow(0 0 3px rgba(0,0,0,0.9))" }}>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <path d="M7 10l5 5 5-5" />
                        <path d="M12 15V3" />
                      </svg>
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* ========== RIGHT PANEL: Extracted icons ========== */}
          <div className="w-full lg:w-64 shrink-0 flex flex-col gap-4 lg:sticky lg:top-6 order-3">
            <div className="rounded-xl border border-card-border bg-card-bg p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-xs uppercase tracking-wide text-muted">
                  Icons ({icons.length})
                </h3>
                {isDetecting && (
                  <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 animate-spin text-muted" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                )}
              </div>

              {icons.length === 0 && !isDetecting && (
                <p className="text-[11px] text-muted py-2">
                  No icons detected. Try lowering the min size or the merge distance.
                </p>
              )}

              <div className="grid grid-cols-3 gap-2">
                {icons.map((icon) => (
                  <button
                    key={icon.id}
                    onClick={() => downloadIcon(icon)}
                    onMouseEnter={() => setHoveredId(icon.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className={`relative aspect-square rounded-lg overflow-hidden border transition-colors cursor-pointer group ${
                      hoveredId === icon.id ? "border-foreground" : "border-card-border"
                    }`}
                    title={`Save ${icon.label}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={icon.dataUrl}
                      alt={icon.label}
                      className="w-full h-full object-contain bg-[repeating-conic-gradient(#e5e5e5_0%_25%,#fff_0%_50%)] bg-size-[8px_8px] dark:bg-[repeating-conic-gradient(#333_0%_25%,#1a1a1a_0%_50%)] dark:bg-size-[8px_8px]"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/45 transition-colors flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <path d="M7 10l5 5 5-5" />
                        <path d="M12 15V3" />
                      </svg>
                    </div>
                    <span className="absolute bottom-0.5 right-1 text-[9px] font-bold font-mono text-white" style={{ textShadow: "0 0 3px rgba(0,0,0,0.95)" }}>
                      {icon.id}
                    </span>
                  </button>
                ))}
              </div>

              {icons.length > 0 && (
                <button
                  onClick={downloadAll}
                  className="w-full mt-3 py-2 rounded-lg bg-foreground text-background font-semibold text-xs hover:opacity-85 transition-opacity cursor-pointer"
                >
                  Download All ({icons.length})
                </button>
              )}
            </div>

            {icons.length > 0 && (
              <div className="rounded-xl border border-card-border bg-card-bg p-3">
                <h3 className="font-semibold text-xs uppercase tracking-wide text-muted mb-2">Sizes</h3>
                <div className="space-y-1">
                  {icons.map((icon) => (
                    <div
                      key={icon.id}
                      className={`flex items-center justify-between px-1.5 py-0.5 rounded text-[11px] font-mono transition-colors ${
                        hoveredId === icon.id ? "bg-foreground/10" : ""
                      }`}
                    >
                      <span className="text-muted">#{icon.id}</span>
                      <span>
                        {icon.w}×{icon.h}px
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
