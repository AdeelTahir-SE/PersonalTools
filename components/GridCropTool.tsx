"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import { useTheme } from "@/context/ThemeContext";

interface CroppedImage {
  id: number;
  dataUrl: string;
  label: string;
}

interface GridLine {
  id: number;
  position: number; // percentage 0-100 of the full image
}

let lineIdCounter = 0;
function nextLineId() {
  return ++lineIdCounter;
}

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

export default function GridCropTool() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"grid" | "crop">("grid");
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [croppedImages, setCroppedImages] = useState<CroppedImage[]>([]);

  // Crop region (percentages 0-100 of the full image)
  const [crop, setCrop] = useState({ x: 0, y: 0, w: 100, h: 100 });

  // Grid lines: absolute % of the full image
  const [hLines, setHLines] = useState<GridLine[]>([]);
  const [vLines, setVLines] = useState<GridLine[]>([]);

  // Drag state
  const dragState = useRef<{
    type: "hLine" | "vLine" | "crop";
    id: number;
    handle?: string;
    startClient: { x: number; y: number };
    snapshot: { hLines: GridLine[]; vLines: GridLine[]; crop: typeof crop };
  } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragType, setDragType] = useState<"hLine" | "vLine" | "crop" | null>(null);

  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });

  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img || !imageSrc) return;
    const update = () => setDisplaySize({ w: img.clientWidth, h: img.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(img);
    return () => ro.disconnect();
  }, [imageSrc]);

  // --- Effective boundaries (WYSIWYG): only lines inside the crop region split it ---
  const effHBounds = useMemo(() => {
    const inner = hLines
      .map((l) => l.position)
      .filter((p) => p > crop.y + 0.1 && p < crop.y + crop.h - 0.1)
      .sort((a, b) => a - b);
    return [crop.y, ...inner, crop.y + crop.h];
  }, [hLines, crop]);

  const effVBounds = useMemo(() => {
    const inner = vLines
      .map((l) => l.position)
      .filter((p) => p > crop.x + 0.1 && p < crop.x + crop.w - 0.1)
      .sort((a, b) => a - b);
    return [crop.x, ...inner, crop.x + crop.w];
  }, [vLines, crop]);

  const rows = effHBounds.length - 1;
  const cols = effVBounds.length - 1;

  // --- File handling ---
  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageSrc(e.target?.result as string);
      setCroppedImages([]);
      setCrop({ x: 0, y: 0, w: 100, h: 100 });
      setHLines([
        { id: nextLineId(), position: 33.33 },
        { id: nextLineId(), position: 66.67 },
      ]);
      setVLines([
        { id: nextLineId(), position: 33.33 },
        { id: nextLineId(), position: 66.67 },
      ]);
      setMode("grid");
    };
    reader.readAsDataURL(file);
  }, []);

  const handleImageLoad = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
  }, []);

  // --- Line management ---
  const addLineInLargestGap = (bounds: number[]) => {
    let maxGap = 0;
    let insertAt = 50;
    for (let i = 0; i < bounds.length - 1; i++) {
      const gap = bounds[i + 1] - bounds[i];
      if (gap > maxGap) {
        maxGap = gap;
        insertAt = (bounds[i] + bounds[i + 1]) / 2;
      }
    }
    return insertAt;
  };

  const addHLine = useCallback(() => {
    setHLines((prev) => {
      const pos = addLineInLargestGap([
        crop.y,
        ...prev.map((l) => l.position).filter((p) => p > crop.y && p < crop.y + crop.h),
        crop.y + crop.h,
      ]);
      return [...prev, { id: nextLineId(), position: pos }].sort((a, b) => a.position - b.position);
    });
  }, [crop]);

  const addVLine = useCallback(() => {
    setVLines((prev) => {
      const pos = addLineInLargestGap([
        crop.x,
        ...prev.map((l) => l.position).filter((p) => p > crop.x && p < crop.x + crop.w),
        crop.x + crop.w,
      ]);
      return [...prev, { id: nextLineId(), position: pos }].sort((a, b) => a.position - b.position);
    });
  }, [crop]);

  const removeLine = useCallback((type: "h" | "v", id: number) => {
    if (type === "h") setHLines((prev) => prev.filter((l) => l.id !== id));
    else setVLines((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const updateLinePosition = useCallback((type: "h" | "v", id: number, pos: number) => {
    const clamped = Math.max(1, Math.min(99, pos));
    const setter = type === "h" ? setHLines : setVLines;
    setter((prev) =>
      prev
        .map((l) => (l.id === id ? { ...l, position: clamped } : l))
        .sort((a, b) => a.position - b.position)
    );
  }, []);

  // --- Pointer handling ---
  const onLinePointerDown = useCallback(
    (e: React.PointerEvent, type: "hLine" | "vLine", id: number) => {
      e.stopPropagation();
      e.preventDefault();
      (e.target as Element).setPointerCapture(e.pointerId);
      dragState.current = {
        type,
        id,
        startClient: { x: e.clientX, y: e.clientY },
        snapshot: {
          hLines: hLines.map((l) => ({ ...l })),
          vLines: vLines.map((l) => ({ ...l })),
          crop: { ...crop },
        },
      };
      setDragActive(true);
      setDraggingId(id);
      setDragType(type);
    },
    [hLines, vLines, crop]
  );

  const onCropHandleDown = useCallback(
    (e: React.PointerEvent, handle: string) => {
      e.stopPropagation();
      e.preventDefault();
      (e.target as Element).setPointerCapture(e.pointerId);
      dragState.current = {
        type: "crop",
        id: 0,
        handle,
        startClient: { x: e.clientX, y: e.clientY },
        snapshot: {
          hLines: hLines.map((l) => ({ ...l })),
          vLines: vLines.map((l) => ({ ...l })),
          crop: { ...crop },
        },
      };
      setDragActive(true);
      setDraggingId(0);
      setDragType("crop");
    },
    [hLines, vLines, crop]
  );

  const onOverlayPointerMove = useCallback((e: React.PointerEvent) => {
    const ds = dragState.current;
    if (!ds || !overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const dxPct = ((e.clientX - ds.startClient.x) / rect.width) * 100;
    const dyPct = ((e.clientY - ds.startClient.y) / rect.height) * 100;

    if (ds.type === "hLine") {
      const orig = ds.snapshot.hLines.find((l) => l.id === ds.id);
      if (orig) {
        const newPos = Math.max(1, Math.min(99, orig.position + dyPct));
        setHLines((prev) =>
          prev
            .map((l) => (l.id === ds.id ? { ...l, position: newPos } : l))
            .sort((a, b) => a.position - b.position)
        );
      }
    }

    if (ds.type === "vLine") {
      const orig = ds.snapshot.vLines.find((l) => l.id === ds.id);
      if (orig) {
        const newPos = Math.max(1, Math.min(99, orig.position + dxPct));
        setVLines((prev) =>
          prev
            .map((l) => (l.id === ds.id ? { ...l, position: newPos } : l))
            .sort((a, b) => a.position - b.position)
        );
      }
    }

    if (ds.type === "crop") {
      const sc = ds.snapshot.crop;
      const [sx, sy, sw, sh] = [sc.x, sc.y, sc.w, sc.h];
      switch (ds.handle) {
        case "move": {
          const nx = Math.max(0, Math.min(100 - sw, sx + dxPct));
          const ny = Math.max(0, Math.min(100 - sh, sy + dyPct));
          setCrop({ x: nx, y: ny, w: sw, h: sh });
          break;
        }
        case "nw": {
          const nx = Math.max(0, Math.min(sx + sw - 5, sx + dxPct));
          const ny = Math.max(0, Math.min(sy + sh - 5, sy + dyPct));
          setCrop({ x: nx, y: ny, w: sw - (nx - sx), h: sh - (ny - sy) });
          break;
        }
        case "ne": {
          const nw = Math.max(5, Math.min(100 - sx, sw + dxPct));
          const ny = Math.max(0, Math.min(sy + sh - 5, sy + dyPct));
          setCrop({ x: sx, y: ny, w: nw, h: sh - (ny - sy) });
          break;
        }
        case "sw": {
          const nx = Math.max(0, Math.min(sx + sw - 5, sx + dxPct));
          const nh = Math.max(5, Math.min(100 - sy, sh + dyPct));
          setCrop({ x: nx, y: sy, w: sw - (nx - sx), h: nh });
          break;
        }
        case "se": {
          const nw = Math.max(5, Math.min(100 - sx, sw + dxPct));
          const nh = Math.max(5, Math.min(100 - sy, sh + dyPct));
          setCrop({ x: sx, y: sy, w: nw, h: nh });
          break;
        }
        case "n": {
          const ny = Math.max(0, Math.min(sy + sh - 5, sy + dyPct));
          setCrop({ x: sx, y: ny, w: sw, h: sh - (ny - sy) });
          break;
        }
        case "s": {
          const nh = Math.max(5, Math.min(100 - sy, sh + dyPct));
          setCrop({ x: sx, y: sy, w: sw, h: nh });
          break;
        }
        case "w": {
          const nx = Math.max(0, Math.min(sx + sw - 5, sx + dxPct));
          setCrop({ x: nx, y: sy, w: sw - (nx - sx), h: sh });
          break;
        }
        case "e": {
          const nw = Math.max(5, Math.min(100 - sx, sw + dxPct));
          setCrop({ x: sx, y: sy, w: nw, h: sh });
          break;
        }
      }
    }
  }, []);

  const onOverlayPointerUp = useCallback(() => {
    dragState.current = null;
    setDragActive(false);
    setDraggingId(null);
    setDragType(null);
  }, []);

  // Click on empty image area to add a line at that spot
  const onOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (dragActive || !overlayRef.current) return;
      const target = e.target as HTMLElement;
      if (target !== overlayRef.current && target !== imgRef.current) return;

      const rect = overlayRef.current.getBoundingClientRect();
      const xPct = ((e.clientX - rect.left) / rect.width) * 100;
      const yPct = ((e.clientY - rect.top) / rect.height) * 100;

      const hDists = hLines.map((l) => Math.abs(l.position - yPct));
      const vDists = vLines.map((l) => Math.abs(l.position - xPct));
      const minH = hDists.length > 0 ? Math.min(...hDists) : Infinity;
      const minV = vDists.length > 0 ? Math.min(...vDists) : Infinity;

      if (minH <= minV) {
        setHLines((prev) =>
          [...prev, { id: nextLineId(), position: yPct }].sort((a, b) => a.position - b.position)
        );
      } else {
        setVLines((prev) =>
          [...prev, { id: nextLineId(), position: xPct }].sort((a, b) => a.position - b.position)
        );
      }
    },
    [dragActive, hLines, vLines]
  );

  // --- Export: crop region is the actual region, split by lines inside it ---
  const applyCrop = useCallback(async () => {
    if (!imageSrc || naturalSize.w === 0) return;
    setIsProcessing(true);

    const srcCanvas = document.createElement("canvas");
    const srcCtx = srcCanvas.getContext("2d")!;
    srcCanvas.width = naturalSize.w;
    srcCanvas.height = naturalSize.h;

    await new Promise<void>((resolve) => {
      const tempImg = new Image();
      tempImg.onload = () => {
        srcCtx.drawImage(tempImg, 0, 0);
        resolve();
      };
      tempImg.src = imageSrc;
    });

    // Convert effective % boundaries to pixel boundaries
    const hPx = effHBounds.map((p) => Math.round((p / 100) * naturalSize.h));
    const vPx = effVBounds.map((p) => Math.round((p / 100) * naturalSize.w));

    const results: CroppedImage[] = [];
    let count = 1;
    const baseName = imageFile?.name.replace(/\.[^.]+$/, "") || "image";
    const ext = imageFile?.name.split(".").pop() || "png";

    for (let r = 0; r < hPx.length - 1; r++) {
      for (let c = 0; c < vPx.length - 1; c++) {
        const sx = vPx[c];
        const sy = hPx[r];
        const sw = vPx[c + 1] - vPx[c];
        const sh = hPx[r + 1] - hPx[r];
        if (sw <= 0 || sh <= 0) continue;

        const cellCanvas = document.createElement("canvas");
        cellCanvas.width = sw;
        cellCanvas.height = sh;
        const cellCtx = cellCanvas.getContext("2d")!;
        cellCtx.drawImage(srcCanvas, sx, sy, sw, sh, 0, 0, sw, sh);

        results.push({
          id: count,
          dataUrl: cellCanvas.toDataURL("image/png"),
          label: `${baseName}_${count}.${ext}`,
        });
        count++;
      }
    }

    setCroppedImages(results);
    setIsProcessing(false);
  }, [imageSrc, effHBounds, effVBounds, naturalSize, imageFile]);

  // Auto-export with debounce
  useEffect(() => {
    if (!imageSrc || naturalSize.w === 0) return;
    const timer = setTimeout(() => {
      applyCrop();
    }, 350);
    return () => clearTimeout(timer);
  }, [imageSrc, naturalSize.w, applyCrop]);

  const downloadImage = useCallback((img: CroppedImage) => {
    const a = document.createElement("a");
    a.href = img.dataUrl;
    a.download = img.label;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  const downloadAll = useCallback(() => {
    croppedImages.forEach((img, i) => {
      setTimeout(() => downloadImage(img), i * 200);
    });
  }, [croppedImages, downloadImage]);

  const reset = useCallback(() => {
    setImageSrc(null);
    setImageFile(null);
    setCroppedImages([]);
    setHLines([]);
    setVLines([]);
    setCrop({ x: 0, y: 0, w: 100, h: 100 });
    setMode("grid");
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
                <h1 className="text-2xl font-bold tracking-tight">Grid Crop</h1>
                <p className="text-sm text-muted">Extract individual icons from a grid image.</p>
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
              <rect x="6" y="10" width="36" height="28" rx="3" />
              <circle cx="18" cy="22" r="4" />
              <path d="M6 34 l12-10 8 6 8-6 8 6" />
            </svg>
            <p className="text-lg font-medium mb-1">Drop your grid image here</p>
            <p className="text-sm text-muted">or click to browse</p>
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
            <h1 className="text-lg font-bold tracking-tight">Grid Crop</h1>
            <span className="text-xs text-muted hidden sm:inline">
              {rows}×{cols} · {rows * cols} sections
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
          {/* ========== LEFT PANEL: Controls ========== */}
          <div className="w-full lg:w-60 shrink-0 flex flex-col gap-4 lg:sticky lg:top-6 order-2 lg:order-1">
            {/* Mode toggle */}
            <div className="rounded-xl border border-card-border bg-card-bg p-1.5 flex gap-1">
              <button
                onClick={() => setMode("grid")}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  mode === "grid"
                    ? "bg-foreground text-background"
                    : "text-muted hover:text-foreground"
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setMode("crop")}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  mode === "crop"
                    ? "bg-foreground text-background"
                    : "text-muted hover:text-foreground"
                }`}
              >
                Crop
              </button>
            </div>

            <p className="text-[11px] text-muted px-1 -mt-2">
              {mode === "grid"
                ? "Drag lines to move. Click image to add a line."
                : "Drag edges or corners of the crop box. Only the area inside is exported."}
            </p>

            {/* Horizontal lines */}
            <div className="rounded-xl border border-card-border bg-card-bg p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-xs uppercase tracking-wide text-muted">Horizontal</h3>
                <button
                  onClick={addHLine}
                  className="w-6 h-6 rounded-md flex items-center justify-center border border-card-border hover:bg-card-border transition-colors cursor-pointer text-sm leading-none"
                  title="Add horizontal line"
                >
                  +
                </button>
              </div>
              <div className="space-y-1">
                {hLines.length === 0 && (
                  <p className="text-[11px] text-muted py-1">No lines</p>
                )}
                {hLines.map((line, idx) => (
                  <div
                    key={line.id}
                    className={`flex items-center gap-1.5 px-1.5 py-1 rounded-md transition-colors ${
                      draggingId === line.id ? "bg-foreground/10" : "hover:bg-background"
                    }`}
                  >
                    <span className="text-[11px] text-muted w-6 shrink-0 font-mono">H{idx + 1}</span>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      step={0.1}
                      value={Math.round(line.position * 10) / 10}
                      onChange={(e) => updateLinePosition("h", line.id, Number(e.target.value))}
                      className="flex-1 min-w-0 text-xs py-0.5 px-1.5 rounded bg-background border border-card-border focus:outline-none focus:border-foreground/40 font-mono"
                    />
                    <span className="text-[10px] text-muted shrink-0">%</span>
                    <button
                      onClick={() => removeLine("h", line.id)}
                      className="text-muted hover:text-foreground transition-colors cursor-pointer p-0.5 shrink-0"
                      title="Remove"
                    >
                      <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4l8 8M12 4l-8 8" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Vertical lines */}
            <div className="rounded-xl border border-card-border bg-card-bg p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-xs uppercase tracking-wide text-muted">Vertical</h3>
                <button
                  onClick={addVLine}
                  className="w-6 h-6 rounded-md flex items-center justify-center border border-card-border hover:bg-card-border transition-colors cursor-pointer text-sm leading-none"
                  title="Add vertical line"
                >
                  +
                </button>
              </div>
              <div className="space-y-1">
                {vLines.length === 0 && (
                  <p className="text-[11px] text-muted py-1">No lines</p>
                )}
                {vLines.map((line, idx) => (
                  <div
                    key={line.id}
                    className={`flex items-center gap-1.5 px-1.5 py-1 rounded-md transition-colors ${
                      draggingId === line.id ? "bg-foreground/10" : "hover:bg-background"
                    }`}
                  >
                    <span className="text-[11px] text-muted w-6 shrink-0 font-mono">V{idx + 1}</span>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      step={0.1}
                      value={Math.round(line.position * 10) / 10}
                      onChange={(e) => updateLinePosition("v", line.id, Number(e.target.value))}
                      className="flex-1 min-w-0 text-xs py-0.5 px-1.5 rounded bg-background border border-card-border focus:outline-none focus:border-foreground/40 font-mono"
                    />
                    <span className="text-[10px] text-muted shrink-0">%</span>
                    <button
                      onClick={() => removeLine("v", line.id)}
                      className="text-muted hover:text-foreground transition-colors cursor-pointer p-0.5 shrink-0"
                      title="Remove"
                    >
                      <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4l8 8M12 4l-8 8" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Crop region */}
            {mode === "crop" && (
              <div className="rounded-xl border border-card-border bg-card-bg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-xs uppercase tracking-wide text-muted">Crop Region</h3>
                  <button
                    onClick={() => setCrop({ x: 0, y: 0, w: 100, h: 100 })}
                    className="text-[10px] text-muted hover:text-foreground underline cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
                  <div className="px-1.5 py-1 rounded bg-background border border-card-border">
                    <span className="text-muted">X </span>{Math.round(crop.x)}%
                  </div>
                  <div className="px-1.5 py-1 rounded bg-background border border-card-border">
                    <span className="text-muted">Y </span>{Math.round(crop.y)}%
                  </div>
                  <div className="px-1.5 py-1 rounded bg-background border border-card-border">
                    <span className="text-muted">W </span>{Math.round(crop.w)}%
                  </div>
                  <div className="px-1.5 py-1 rounded bg-background border border-card-border">
                    <span className="text-muted">H </span>{Math.round(crop.h)}%
                  </div>
                </div>
                {naturalSize.w > 0 && (
                  <p className="text-[10px] text-muted mt-2 font-mono">
                    {Math.round((crop.w / 100) * naturalSize.w)} × {Math.round((crop.h / 100) * naturalSize.h)}px
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ========== CENTER: Image ========== */}
          <div className="flex-1 min-w-0 flex justify-center order-1 lg:order-2">
            <div className="relative inline-block select-none">
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Uploaded"
                onLoad={handleImageLoad}
                className="max-w-full h-auto rounded-lg block border border-card-border"
                style={{ maxHeight: "78vh" }}
                draggable={false}
              />

              {displaySize.w > 0 && (
                <div
                  ref={overlayRef}
                  className="absolute inset-0 rounded-lg"
                  style={{ cursor: dragActive ? "grabbing" : "crosshair" }}
                  onClick={onOverlayClick}
                  onPointerMove={onOverlayPointerMove}
                  onPointerUp={onOverlayPointerUp}
                >
                  {/* Grid lines — white with black outline (monochrome) */}
                  {hLines.map((line) => {
                    const active = dragActive && draggingId === line.id;
                    const insideCrop =
                      line.position > crop.y && line.position < crop.y + crop.h;
                    return (
                      <div
                        key={line.id}
                        onPointerDown={(e) => onLinePointerDown(e, "hLine", line.id)}
                        className="absolute left-0 right-0 z-10"
                        style={{
                          top: `${line.position}%`,
                          transform: "translateY(-50%)",
                          height: "16px",
                          cursor: "ns-resize",
                          touchAction: "none",
                        }}
                      >
                        <div
                          className="absolute left-0 right-0 pointer-events-none"
                          style={{
                            top: "50%",
                            height: active ? "3px" : "1.5px",
                            transform: "translateY(-50%)",
                            backgroundColor: "#fff",
                            boxShadow: "0 0 0 1px rgba(0,0,0,0.65)",
                            opacity: insideCrop ? 1 : 0.35,
                          }}
                        />
                        <span
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 px-1 py-px rounded text-[9px] font-bold font-mono pointer-events-none"
                          style={{
                            backgroundColor: active ? "#fff" : "rgba(0,0,0,0.75)",
                            color: active ? "#000" : "#fff",
                          }}
                        >
                          {Math.round(line.position)}
                        </span>
                      </div>
                    );
                  })}

                  {vLines.map((line) => {
                    const active = dragActive && draggingId === line.id;
                    const insideCrop =
                      line.position > crop.x && line.position < crop.x + crop.w;
                    return (
                      <div
                        key={line.id}
                        onPointerDown={(e) => onLinePointerDown(e, "vLine", line.id)}
                        className="absolute top-0 bottom-0 z-10"
                        style={{
                          left: `${line.position}%`,
                          transform: "translateX(-50%)",
                          width: "16px",
                          cursor: "ew-resize",
                          touchAction: "none",
                        }}
                      >
                        <div
                          className="absolute top-0 bottom-0 pointer-events-none"
                          style={{
                            left: "50%",
                            width: active ? "3px" : "1.5px",
                            transform: "translateX(-50%)",
                            backgroundColor: "#fff",
                            boxShadow: "0 0 0 1px rgba(0,0,0,0.65)",
                            opacity: insideCrop ? 1 : 0.35,
                          }}
                        />
                        <span
                          className="absolute top-1.5 left-1/2 -translate-x-1/2 px-1 py-px rounded text-[9px] font-bold font-mono pointer-events-none"
                          style={{
                            backgroundColor: active ? "#fff" : "rgba(0,0,0,0.75)",
                            color: active ? "#000" : "#fff",
                          }}
                        >
                          {Math.round(line.position)}
                        </span>
                      </div>
                    );
                  })}

                  {/* Cell crosshairs + numbers (inside effective crop region) */}
                  {(() => {
                    const cells: React.ReactNode[] = [];
                    let num = 1;
                    for (let r = 0; r < effHBounds.length - 1; r++) {
                      for (let c = 0; c < effVBounds.length - 1; c++) {
                        const cx = (effVBounds[c] + effVBounds[c + 1]) / 2;
                        const cy = (effHBounds[r] + effHBounds[r + 1]) / 2;
                        cells.push(
                          <div
                            key={`cell-${r}-${c}`}
                            className="absolute pointer-events-none"
                            style={{
                              left: `${cx}%`,
                              top: `${cy}%`,
                              transform: "translate(-50%, -50%)",
                            }}
                          >
                            <div
                              className="absolute"
                              style={{
                                width: 1,
                                height: 14,
                                left: "50%",
                                top: "50%",
                                transform: "translate(-50%, -50%)",
                                backgroundColor: "#fff",
                                boxShadow: "0 0 0 0.5px rgba(0,0,0,0.6)",
                              }}
                            />
                            <div
                              className="absolute"
                              style={{
                                width: 14,
                                height: 1,
                                left: "50%",
                                top: "50%",
                                transform: "translate(-50%, -50%)",
                                backgroundColor: "#fff",
                                boxShadow: "0 0 0 0.5px rgba(0,0,0,0.6)",
                              }}
                            />
                            <span
                              className="relative block text-center text-white text-[11px] font-bold font-mono"
                              style={{
                                textShadow: "0 0 4px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,1)",
                                marginTop: 12,
                              }}
                            >
                              {num}
                            </span>
                          </div>
                        );
                        num++;
                      }
                    }
                    return cells;
                  })()}

                  {/* Crop overlay */}
                  {mode === "crop" && (
                    <>
                      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 20 }}>
                        <div className="absolute left-0 right-0 top-0 bg-black/55" style={{ height: `${crop.y}%` }} />
                        <div className="absolute left-0 right-0 bottom-0 bg-black/55" style={{ height: `${100 - crop.y - crop.h}%` }} />
                        <div className="absolute bg-black/55" style={{ top: `${crop.y}%`, left: 0, width: `${crop.x}%`, height: `${crop.h}%` }} />
                        <div className="absolute bg-black/55" style={{ top: `${crop.y}%`, right: 0, width: `${100 - crop.x - crop.w}%`, height: `${crop.h}%` }} />
                      </div>

                      <div
                        className="absolute pointer-events-none"
                        style={{
                          left: `${crop.x}%`,
                          top: `${crop.y}%`,
                          width: `${crop.w}%`,
                          height: `${crop.h}%`,
                          border: `${dragActive && dragType === "crop" ? "2.5px" : "1.5px"} solid #fff`,
                          boxShadow: "0 0 0 1px rgba(0,0,0,0.65), inset 0 0 0 1px rgba(0,0,0,0.65)",
                          zIndex: 21,
                        }}
                      />

                      {/* Move zone */}
                      <div
                        onPointerDown={(e) => onCropHandleDown(e, "move")}
                        className="absolute"
                        style={{
                          left: `${crop.x}%`,
                          top: `${crop.y}%`,
                          width: `${crop.w}%`,
                          height: `${crop.h}%`,
                          cursor: "move",
                          zIndex: 22,
                          touchAction: "none",
                        }}
                      />

                      {/* Edge handles */}
                      <div onPointerDown={(e) => onCropHandleDown(e, "n")} className="absolute" style={{ left: `${crop.x}%`, top: `${crop.y}%`, width: `${crop.w}%`, height: "8px", transform: "translateY(-4px)", cursor: "ns-resize", zIndex: 23, touchAction: "none" }} />
                      <div onPointerDown={(e) => onCropHandleDown(e, "s")} className="absolute" style={{ left: `${crop.x}%`, top: `${crop.y + crop.h}%`, width: `${crop.w}%`, height: "8px", transform: "translateY(-4px)", cursor: "ns-resize", zIndex: 23, touchAction: "none" }} />
                      <div onPointerDown={(e) => onCropHandleDown(e, "w")} className="absolute" style={{ left: `${crop.x}%`, top: `${crop.y}%`, width: "8px", height: `${crop.h}%`, transform: "translateX(-4px)", cursor: "ew-resize", zIndex: 23, touchAction: "none" }} />
                      <div onPointerDown={(e) => onCropHandleDown(e, "e")} className="absolute" style={{ left: `${crop.x + crop.w}%`, top: `${crop.y}%`, width: "8px", height: `${crop.h}%`, transform: "translateX(-4px)", cursor: "ew-resize", zIndex: 23, touchAction: "none" }} />

                      {/* Corner handles — white squares with black border */}
                      {[
                        { h: "nw", x: crop.x, y: crop.y, cur: "nwse-resize" },
                        { h: "ne", x: crop.x + crop.w, y: crop.y, cur: "nesw-resize" },
                        { h: "sw", x: crop.x, y: crop.y + crop.h, cur: "nesw-resize" },
                        { h: "se", x: crop.x + crop.w, y: crop.y + crop.h, cur: "nwse-resize" },
                      ].map(({ h, x, y, cur }) => (
                        <div
                          key={h}
                          onPointerDown={(e) => onCropHandleDown(e, h)}
                          className="absolute"
                          style={{
                            left: `${x}%`,
                            top: `${y}%`,
                            width: "11px",
                            height: "11px",
                            transform: "translate(-50%, -50%)",
                            backgroundColor: "#fff",
                            border: "1.5px solid #000",
                            cursor: cur,
                            zIndex: 24,
                            touchAction: "none",
                          }}
                        />
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ========== RIGHT PANEL: Results ========== */}
          <div className="w-full lg:w-64 shrink-0 flex flex-col gap-4 lg:sticky lg:top-6 order-3">
            <div className="rounded-xl border border-card-border bg-card-bg p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-xs uppercase tracking-wide text-muted">
                  Output
                  {isProcessing && (
                    <span className="ml-2 inline-block w-2.5 h-2.5 rounded-full border-2 border-muted border-t-foreground animate-spin align-middle" />
                  )}
                </h3>
                {croppedImages.length > 0 && (
                  <button
                    onClick={downloadAll}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-foreground text-background hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    Download All
                  </button>
                )}
              </div>

              {croppedImages.length === 0 ? (
                <p className="text-[11px] text-muted py-2">Sections appear here automatically.</p>
              ) : (
                <div
                  className="grid gap-1.5"
                  style={{ gridTemplateColumns: `repeat(${Math.min(cols, 3)}, minmax(0, 1fr))` }}
                >
                  {croppedImages.map((img) => (
                    <button
                      key={img.id}
                      onClick={() => downloadImage(img)}
                      className="group relative aspect-square rounded-md overflow-hidden border border-card-border hover:border-foreground/40 transition-colors cursor-pointer"
                      title={`Download ${img.label}`}
                    >
                      <img
                        src={img.dataUrl}
                        alt={img.label}
                        className="w-full h-full object-contain bg-[repeating-conic-gradient(#e5e5e5_0%_25%,#fff_0%_50%)] bg-[length:8px_8px] dark:bg-[repeating-conic-gradient(#333_0%_25%,#1a1a1a_0%_50%)] dark:bg-[length:8px_8px]"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/45 transition-colors flex items-center justify-center">
                        <span className="text-white text-[11px] font-bold font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                          #{img.id}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Section sizes */}
            {naturalSize.w > 0 && croppedImages.length > 0 && (
              <div className="rounded-xl border border-card-border bg-card-bg p-3">
                <h3 className="font-semibold text-xs uppercase tracking-wide text-muted mb-2">Sizes</h3>
                <div className="text-[11px] text-muted font-mono space-y-0.5 max-h-40 overflow-y-auto">
                  {(() => {
                    const hPx = effHBounds.map((p) => Math.round((p / 100) * naturalSize.h));
                    const vPx = effVBounds.map((p) => Math.round((p / 100) * naturalSize.w));
                    const items: React.ReactNode[] = [];
                    let num = 1;
                    for (let r = 0; r < hPx.length - 1; r++) {
                      for (let c = 0; c < vPx.length - 1; c++) {
                        items.push(
                          <p key={`sz-${r}-${c}`}>
                            #{num}: {vPx[c + 1] - vPx[c]} × {hPx[r + 1] - hPx[r]}px
                          </p>
                        );
                        num++;
                      }
                    }
                    return items;
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
