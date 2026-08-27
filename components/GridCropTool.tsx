"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "@/context/ThemeContext";

interface CroppedImage {
  id: number;
  dataUrl: string;
  label: string;
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

  // Crop region (percentages 0-100)
  const [crop, setCrop] = useState({ x: 0, y: 0, w: 100, h: 100 });

  // Grid line positions (percentages 0-100)
  const [hLines, setHLines] = useState<number[]>([]);
  const [vLines, setVLines] = useState<number[]>([]);

  // Drag state
  const [dragTarget, setDragTarget] = useState<{
    type: "crop" | "hLine" | "vLine";
    index?: number;
    handle?: string;
    startPointer: { x: number; y: number };
    startValue: number[] | number;
  } | null>(null);

  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });

  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track image display size
  useEffect(() => {
    const img = imgRef.current;
    if (!img || !imageSrc) return;
    const update = () =>
      setDisplaySize({ w: img.clientWidth, h: img.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(img);
    return () => ro.disconnect();
  }, [imageSrc]);

  // File handling
  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageSrc(e.target?.result as string);
      setCroppedImages([]);
      setCrop({ x: 0, y: 0, w: 100, h: 100 });
      setMode("grid");
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleImageLoad = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
  }, []);

  // Grid management
  const setGridSize = useCallback(
    (rows: number, cols: number) => {
      setHLines(
        Array.from({ length: Math.max(0, rows - 1) }, (_, i) =>
          ((i + 1) * 100) / rows
        )
      );
      setVLines(
        Array.from({ length: Math.max(0, cols - 1) }, (_, i) =>
          ((i + 1) * 100) / cols
        )
      );
    },
    []
  );

  // Initialize default grid
  useEffect(() => {
    if (imageSrc && hLines.length === 0 && vLines.length === 0) {
      setGridSize(3, 3);
    }
  }, [imageSrc, hLines.length, vLines.length, setGridSize]);

  // --- Pointer event helpers ---
  const getRelativePos = useCallback(
    (clientX: number, clientY: number) => {
      const container = containerRef.current;
      if (!container) return { xPct: 0, yPct: 0 };
      const rect = container.getBoundingClientRect();
      return {
        xPct: Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)),
        yPct: Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100)),
      };
    },
    []
  );

  // Pointer down on SVG
  const handleSvgPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const target = e.nativeEvent.target as SVGElement;

      // Grid line drag
      if (target.dataset.type === "hline") {
        const idx = Number(target.dataset.index);
        setDragTarget({
          type: "hLine",
          index: idx,
          startPointer: { x: e.clientX, y: e.clientY },
          startValue: [...hLines],
        });
        (e.target as Element).setPointerCapture(e.pointerId);
        return;
      }
      if (target.dataset.type === "vline") {
        const idx = Number(target.dataset.index);
        setDragTarget({
          type: "vLine",
          index: idx,
          startPointer: { x: e.clientX, y: e.clientY },
          startValue: [...vLines],
        });
        (e.target as Element).setPointerCapture(e.pointerId);
        return;
      }

      // Crop interactions (only in crop mode)
      if (mode === "crop" && containerRef.current) {
        const { xPct, yPct } = getRelativePos(e.clientX, e.clientY);
        const type = target.dataset.type;

        if (type === "crop-handle" || type === "crop-edge") {
          setDragTarget({
            type: "crop",
            handle: target.dataset.handle,
            startPointer: { x: e.clientX, y: e.clientY },
            startValue: [crop.x, crop.y, crop.w, crop.h],
          });
          (e.target as Element).setPointerCapture(e.pointerId);
          return;
        }

        // Click inside crop area → move
        if (
          xPct >= crop.x &&
          xPct <= crop.x + crop.w &&
          yPct >= crop.y &&
          yPct <= crop.y + crop.h
        ) {
          setDragTarget({
            type: "crop",
            handle: "move",
            startPointer: { x: e.clientX, y: e.clientY },
            startValue: [crop.x, crop.y, crop.w, crop.h],
          });
          (e.target as Element).setPointerCapture(e.pointerId);
        }
      }
    },
    [hLines, vLines, mode, crop, getRelativePos]
  );

  const handleSvgPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!dragTarget || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dxPct = ((e.clientX - dragTarget.startPointer.x) / rect.width) * 100;
      const dyPct = ((e.clientY - dragTarget.startPointer.y) / rect.height) * 100;

      if (dragTarget.type === "hLine" && dragTarget.index !== undefined) {
        const startArr = dragTarget.startValue as number[];
        const newVal = Math.max(2, Math.min(98, startArr[dragTarget.index] + dyPct));
        setHLines((prev) => {
          const next = [...prev];
          next[dragTarget.index!] = newVal;
          return next;
        });
      }

      if (dragTarget.type === "vLine" && dragTarget.index !== undefined) {
        const startArr = dragTarget.startValue as number[];
        const newVal = Math.max(2, Math.min(98, startArr[dragTarget.index] + dxPct));
        setVLines((prev) => {
          const next = [...prev];
          next[dragTarget.index!] = newVal;
          return next;
        });
      }

      if (dragTarget.type === "crop") {
        const sv = dragTarget.startValue as number[];
        const [sx, sy, sw, sh] = sv;

        switch (dragTarget.handle) {
          case "move": {
            let nx = sx + dxPct;
            let ny = sy + dyPct;
            nx = Math.max(0, Math.min(100 - sw, nx));
            ny = Math.max(0, Math.min(100 - sh, ny));
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
            const neOrig = sx + sw;
            const nw = Math.max(5, Math.min(neOrig, neOrig + dxPct - sx));
            const ny = Math.max(0, Math.min(sy + sh - 5, sy + dyPct));
            setCrop({ x: sx, y: ny, w: nw, h: sh - (ny - sy) });
            break;
          }
          case "sw": {
            const nx = Math.max(0, Math.min(sx + sw - 5, sx + dxPct));
            const seOrig = sy + sh;
            const nh = Math.max(5, Math.min(seOrig, seOrig + dyPct - sy));
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
    },
    [dragTarget]
  );

  const handleSvgPointerUp = useCallback(() => {
    setDragTarget(null);
  }, []);

  // Apply crop + grid → export sections
  const applyCrop = useCallback(async () => {
    if (!imageSrc) return;
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

    // Crop region in pixels
    const cx = Math.round((crop.x / 100) * naturalSize.w);
    const cy = Math.round((crop.y / 100) * naturalSize.h);
    const cw = Math.round((crop.w / 100) * naturalSize.w);
    const ch = Math.round((crop.h / 100) * naturalSize.h);

    // All line boundaries (including crop edges) in pixel coords
    const hBounds = [cy, ...hLines.map((l) => cy + Math.round((l / 100) * ch)), cy + ch];
    const vBounds = [cx, ...vLines.map((l) => cx + Math.round((l / 100) * cw)), cx + cw];

    const results: CroppedImage[] = [];
    let count = 1;
    const baseName = imageFile?.name.replace(/\.[^.]+$/, "") || "image";
    const ext = imageFile?.name.split(".").pop() || "png";

    for (let r = 0; r < hBounds.length - 1; r++) {
      for (let c = 0; c < vBounds.length - 1; c++) {
        const sx = vBounds[c];
        const sy = hBounds[r];
        const sw = vBounds[c + 1] - vBounds[c];
        const sh = hBounds[r + 1] - hBounds[r];
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
  }, [imageSrc, crop, hLines, vLines, naturalSize, imageFile]);

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

  const toggleMode = useCallback(() => {
    setMode((m) => (m === "grid" ? "crop" : "grid"));
  }, []);

  const rows = hLines.length + 1;
  const cols = vLines.length + 1;

  // --- UPLOAD STATE ---
  if (!imageSrc) {
    return (
      <div className="flex flex-col flex-1 bg-background min-h-screen">
        <div className="w-full max-w-6xl mx-auto px-6 py-8">
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
                <p className="text-sm text-muted">Upload an image, place grid lines, and export cropped sections.</p>
              </div>
            </div>
            <ThemeToggle />
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
            onDragLeave={() => setIsDraggingOver(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-20 flex flex-col items-center justify-center cursor-pointer transition-all ${
              isDraggingOver
                ? "border-foreground bg-card-bg"
                : "border-card-border hover:border-foreground/30 hover:bg-card-bg/50"
            }`}
          >
            <svg viewBox="0 0 48 48" fill="none" className="w-16 h-16 mb-4 text-muted" stroke="currentColor" strokeWidth="1.5">
              <rect x="6" y="10" width="36" height="28" rx="3" />
              <circle cx="18" cy="22" r="4" />
              <path d="M6 34 l12-10 8 6 8-6 8 6" />
            </svg>
            <p className="text-lg font-medium mb-1">Drop your image here</p>
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

  // --- EDITOR STATE ---
  return (
    <div className="flex flex-col flex-1 bg-background min-h-screen">
      <div className="w-full max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
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
              <p className="text-sm text-muted">Drag grid lines to adjust. Toggle crop mode to select a region.</p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* Main area */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Image + Overlay */}
          <div className="flex-1 min-w-0">
            <div
              ref={containerRef}
              className="relative inline-block select-none"
            >
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Uploaded"
                onLoad={handleImageLoad}
                className="max-w-full h-auto rounded-lg block"
                style={{ maxHeight: "70vh" }}
                draggable={false}
              />

              {/* SVG overlay */}
              {displaySize.w > 0 && (
                <svg
                  className="absolute top-0 left-0 rounded-lg"
                  width={displaySize.w}
                  height={displaySize.h}
                  style={{ cursor: dragTarget ? "grabbing" : "default" }}
                  onPointerDown={handleSvgPointerDown}
                  onPointerMove={handleSvgPointerMove}
                  onPointerUp={handleSvgPointerUp}
                  onLostPointerCapture={handleSvgPointerUp}
                >
                  <defs>
                    <filter id="line-shadow">
                      <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#000" floodOpacity="0.5" />
                    </filter>
                  </defs>

                  {/* Crop mode elements */}
                  {mode === "crop" && (
                    <>
                      {/* Dimmed area outside crop using mask */}
                      <defs>
                        <mask id="crop-mask">
                          <rect x={0} y={0} width={displaySize.w} height={displaySize.h} fill="white" />
                          <rect
                            x={(crop.x / 100) * displaySize.w}
                            y={(crop.y / 100) * displaySize.h}
                            width={(crop.w / 100) * displaySize.w}
                            height={(crop.h / 100) * displaySize.h}
                            fill="black"
                          />
                        </mask>
                      </defs>
                      <rect
                        x={0} y={0} width={displaySize.w} height={displaySize.h}
                        fill="black" opacity={0.45}
                        mask="url(#crop-mask)"
                        pointerEvents="none"
                      />

                      {/* Crop border */}
                      <rect
                        x={(crop.x / 100) * displaySize.w}
                        y={(crop.y / 100) * displaySize.h}
                        width={(crop.w / 100) * displaySize.w}
                        height={(crop.h / 100) * displaySize.h}
                        fill="none"
                        stroke={dragTarget?.type === "crop" ? "#facc15" : "#22c55e"}
                        strokeWidth="2"
                        strokeDasharray="6 3"
                        pointerEvents="none"
                      />

                      {/* Rule-of-thirds inside crop */}
                      {[1, 2].map((i) => (
                        <line
                          key={`cth-${i}`}
                          x1={(crop.x / 100) * displaySize.w}
                          y1={((crop.y + (crop.h * i) / 3) / 100) * displaySize.h}
                          x2={((crop.x + crop.w) / 100) * displaySize.w}
                          y2={((crop.y + (crop.h * i) / 3) / 100) * displaySize.h}
                          stroke="white"
                          strokeWidth="0.5"
                          opacity={0.4}
                          pointerEvents="none"
                        />
                      ))}
                      {[1, 2].map((i) => (
                        <line
                          key={`ctv-${i}`}
                          x1={((crop.x + (crop.w * i) / 3) / 100) * displaySize.w}
                          y1={(crop.y / 100) * displaySize.h}
                          x2={((crop.x + (crop.w * i) / 3) / 100) * displaySize.w}
                          y2={((crop.y + crop.h) / 100) * displaySize.h}
                          stroke="white"
                          strokeWidth="0.5"
                          opacity={0.4}
                          pointerEvents="none"
                        />
                      ))}

                      {/* Edge drag zones */}
                      {/* Top edge */}
                      <rect
                        x={(crop.x / 100) * displaySize.w}
                        y={(crop.y / 100) * displaySize.h - 5}
                        width={(crop.w / 100) * displaySize.w}
                        height={10}
                        fill="transparent"
                        data-type="crop-edge"
                        data-handle="n"
                        style={{ cursor: "ns-resize" }}
                      />
                      {/* Bottom edge */}
                      <rect
                        x={(crop.x / 100) * displaySize.w}
                        y={((crop.y + crop.h) / 100) * displaySize.h - 5}
                        width={(crop.w / 100) * displaySize.w}
                        height={10}
                        fill="transparent"
                        data-type="crop-edge"
                        data-handle="s"
                        style={{ cursor: "ns-resize" }}
                      />
                      {/* Left edge */}
                      <rect
                        x={(crop.x / 100) * displaySize.w - 5}
                        y={(crop.y / 100) * displaySize.h}
                        width={10}
                        height={(crop.h / 100) * displaySize.h}
                        fill="transparent"
                        data-type="crop-edge"
                        data-handle="w"
                        style={{ cursor: "ew-resize" }}
                      />
                      {/* Right edge */}
                      <rect
                        x={((crop.x + crop.w) / 100) * displaySize.w - 5}
                        y={(crop.y / 100) * displaySize.h}
                        width={10}
                        height={(crop.h / 100) * displaySize.h}
                        fill="transparent"
                        data-type="crop-edge"
                        data-handle="e"
                        style={{ cursor: "ew-resize" }}
                      />

                      {/* Corner handles */}
                      {[
                        { handle: "nw", x: crop.x, y: crop.y, cursor: "nwse-resize" },
                        { handle: "ne", x: crop.x + crop.w, y: crop.y, cursor: "nesw-resize" },
                        { handle: "sw", x: crop.x, y: crop.y + crop.h, cursor: "nesw-resize" },
                        { handle: "se", x: crop.x + crop.w, y: crop.y + crop.h, cursor: "nwse-resize" },
                      ].map(({ handle, x, y, cursor }) => (
                        <rect
                          key={handle}
                          x={(x / 100) * displaySize.w - 6}
                          y={(y / 100) * displaySize.h - 6}
                          width={12}
                          height={12}
                          rx={2}
                          fill="white"
                          stroke={dragTarget?.type === "crop" ? "#facc15" : "#22c55e"}
                          strokeWidth="2"
                          data-type="crop-handle"
                          data-handle={handle}
                          style={{ cursor }}
                        />
                      ))}

                      {/* Move zone (center of crop) */}
                      <rect
                        x={(crop.x / 100) * displaySize.w + 8}
                        y={(crop.y / 100) * displaySize.h + 8}
                        width={Math.max(0, (crop.w / 100) * displaySize.w - 16)}
                        height={Math.max(0, (crop.h / 100) * displaySize.h - 16)}
                        fill="transparent"
                        data-type="crop-move"
                        data-handle="move"
                        style={{ cursor: "move" }}
                      />
                    </>
                  )}

                  {/* Grid lines (always visible) */}
                  {hLines.map((pos, i) => {
                    const y = (pos / 100) * displaySize.h;
                    const isActive = dragTarget?.type === "hLine" && dragTarget.index === i;
                    return (
                      <g key={`h-${i}`}>
                        <line
                          x1={0} y1={y} x2={displaySize.w} y2={y}
                          stroke="transparent" strokeWidth={14}
                          data-type="hline" data-index={i}
                          style={{ cursor: "ns-resize" }}
                        />
                        <line
                          x1={0} y1={y} x2={displaySize.w} y2={y}
                          stroke={isActive ? "#facc15" : "white"}
                          strokeWidth={isActive ? 2.5 : 1.5}
                          filter="url(#line-shadow)"
                          pointerEvents="none"
                        />
                        {/* Label */}
                        <rect x={displaySize.w - 28} y={y - 10} width={24} height={20} rx={4} fill="rgba(0,0,0,0.6)" pointerEvents="none" />
                        <text
                          x={displaySize.w - 16} y={y + 1}
                          textAnchor="middle" dominantBaseline="central"
                          fill="white" fontSize="10" fontWeight="600"
                          pointerEvents="none"
                        >
                          {Math.round(pos)}%
                        </text>
                      </g>
                    );
                  })}

                  {vLines.map((pos, i) => {
                    const x = (pos / 100) * displaySize.w;
                    const isActive = dragTarget?.type === "vLine" && dragTarget.index === i;
                    return (
                      <g key={`v-${i}`}>
                        <line
                          x1={x} y1={0} x2={x} y2={displaySize.h}
                          stroke="transparent" strokeWidth={14}
                          data-type="vline" data-index={i}
                          style={{ cursor: "ew-resize" }}
                        />
                        <line
                          x1={x} y1={0} x2={x} y2={displaySize.h}
                          stroke={isActive ? "#facc15" : "white"}
                          strokeWidth={isActive ? 2.5 : 1.5}
                          filter="url(#line-shadow)"
                          pointerEvents="none"
                        />
                        {/* Label */}
                        <rect x={x - 12} y={4} width={24} height={20} rx={4} fill="rgba(0,0,0,0.6)" pointerEvents="none" />
                        <text
                          x={x} y={14}
                          textAnchor="middle" dominantBaseline="central"
                          fill="white" fontSize="10" fontWeight="600"
                          pointerEvents="none"
                        >
                          {Math.round(pos)}%
                        </text>
                      </g>
                    );
                  })}

                  {/* Cell numbers */}
                  {Array.from({ length: rows }).map((_, r) =>
                    Array.from({ length: cols }).map((__, c) => {
                      const hBounds = [0, ...hLines, 100];
                      const vBounds = [0, ...vLines, 100];
                      const cx = ((vBounds[c] + vBounds[c + 1]) / 2 / 100) * displaySize.w;
                      const cy = ((hBounds[r] + hBounds[r + 1]) / 2 / 100) * displaySize.h;
                      const num = r * cols + c + 1;
                      return (
                        <text
                          key={`n-${r}-${c}`}
                          x={cx} y={cy}
                          textAnchor="middle" dominantBaseline="central"
                          fill="white" fontSize="13" fontWeight="bold"
                          style={{ textShadow: "0 0 6px rgba(0,0,0,0.9)" }}
                          pointerEvents="none"
                        >
                          {num}
                        </text>
                      );
                    })
                  )}
                </svg>
              )}
            </div>
          </div>

          {/* Controls Panel */}
          <div className="w-full lg:w-72 shrink-0 flex flex-col gap-4">
            {/* Mode toggle */}
            <div className="rounded-xl border border-card-border bg-card-bg p-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setMode("grid")}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    mode === "grid"
                      ? "bg-foreground text-background"
                      : "bg-transparent hover:bg-card-border"
                  }`}
                >
                  Grid
                </button>
                <button
                  onClick={toggleMode}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    mode === "crop"
                      ? "bg-green-600 text-white"
                      : "bg-transparent hover:bg-card-border"
                  }`}
                >
                  <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="14" height="14" rx="1" />
                    <path d="M3 8h14M8 3v14" />
                  </svg>
                  Crop
                </button>
              </div>
              {mode === "crop" && (
                <p className="text-xs text-green-500 mt-2">
                  Drag the crop region edges or corners to adjust.
                </p>
              )}
              {mode === "grid" && (
                <p className="text-xs text-muted mt-2">
                  Drag any grid line to reposition it.
                </p>
              )}
            </div>

            {/* Grid Settings */}
            <div className="rounded-xl border border-card-border bg-card-bg p-4">
              <h3 className="font-semibold mb-3 text-sm">Grid Lines</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted mb-1 block">
                    Rows: <span className="font-semibold text-foreground">{rows}</span>
                  </label>
                  <div className="flex gap-1">
                    {[2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => setGridSize(n, cols)}
                        className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                          rows === n ? "bg-foreground text-background" : "bg-background hover:bg-card-border"
                        } border border-card-border`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted mb-1 block">
                    Columns: <span className="font-semibold text-foreground">{cols}</span>
                  </label>
                  <div className="flex gap-1">
                    {[2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => setGridSize(rows, n)}
                        className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                          cols === n ? "bg-foreground text-background" : "bg-background hover:bg-card-border"
                        } border border-card-border`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-3 text-xs text-muted space-y-0.5">
                <p>{rows} × {cols} = {rows * cols} sections</p>
                {naturalSize.w > 0 && (
                  <p>
                    Image: {naturalSize.w} × {naturalSize.h}px
                    {crop.w < 100 || crop.h < 100
                      ? ` → Crop: ${Math.round((crop.w / 100) * naturalSize.w)} × ${Math.round((crop.h / 100) * naturalSize.h)}px`
                      : ""}
                  </p>
                )}
              </div>
            </div>

            {/* Crop info (when in crop mode) */}
            {mode === "crop" && (
              <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4">
                <h3 className="font-semibold mb-2 text-sm text-green-500">Crop Region</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted">X: </span>
                    <span className="font-mono">{Math.round(crop.x)}%</span>
                  </div>
                  <div>
                    <span className="text-muted">Y: </span>
                    <span className="font-mono">{Math.round(crop.y)}%</span>
                  </div>
                  <div>
                    <span className="text-muted">W: </span>
                    <span className="font-mono">{Math.round(crop.w)}%</span>
                  </div>
                  <div>
                    <span className="text-muted">H: </span>
                    <span className="font-mono">{Math.round(crop.h)}%</span>
                  </div>
                </div>
                <button
                  onClick={() => setCrop({ x: 0, y: 0, w: 100, h: 100 })}
                  className="mt-3 w-full py-1.5 rounded text-xs font-medium border border-card-border hover:bg-card-border transition-colors cursor-pointer"
                >
                  Reset to full image
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <button
                onClick={applyCrop}
                disabled={isProcessing}
                className="w-full py-2.5 rounded-lg bg-foreground text-background font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
              >
                {isProcessing ? "Processing..." : `Apply Crop (${rows * cols} sections)`}
              </button>
              <button
                onClick={reset}
                className="w-full py-2.5 rounded-lg border border-card-border bg-card-bg font-medium text-sm hover:bg-card-border transition-colors cursor-pointer"
              >
                New Image
              </button>
            </div>

            {/* Results */}
            {croppedImages.length > 0 && (
              <div className="rounded-xl border border-card-border bg-card-bg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">Results ({croppedImages.length})</h3>
                  <button
                    onClick={downloadAll}
                    className="text-xs font-medium px-3 py-1.5 rounded-full bg-foreground text-background hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    Download All
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {croppedImages.map((img) => (
                    <button
                      key={img.id}
                      onClick={() => downloadImage(img)}
                      className="group relative aspect-square rounded-lg overflow-hidden border border-card-border hover:border-foreground/30 transition-colors cursor-pointer"
                      title={`Download ${img.label}`}
                    >
                      <img
                        src={img.dataUrl}
                        alt={img.label}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                        <span className="text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                          {img.id}
                        </span>
                      </div>
                    </button>
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
