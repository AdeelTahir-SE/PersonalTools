"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";

interface CroppedImage {
  id: number;
  dataUrl: string;
  label: string;
}

export default function GridCropTool() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [croppedImages, setCroppedImages] = useState<CroppedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Natural image dimensions
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  // Display size
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageSrc(e.target?.result as string);
      setCroppedImages([]);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // When image loads, compute sizes
  const handleImageLoad = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
  }, []);

  // Resize observer for display size
  useEffect(() => {
    const img = imgRef.current;
    if (!img || !imageSrc) return;

    const updateSize = () => {
      setDisplaySize({ w: img.clientWidth, h: img.clientHeight });
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(img);
    return () => ro.disconnect();
  }, [imageSrc]);

  const applyCrop = useCallback(async () => {
    if (!imgRef.current || !imageSrc) return;
    setIsProcessing(true);

    const img = imgRef.current;
    const { w: nw, h: nh } = { w: img.naturalWidth, h: img.naturalHeight };

    const cellW = Math.floor(nw / cols);
    const cellH = Math.floor(nh / rows);
    const results: CroppedImage[] = [];
    let count = 1;

    // Create an offscreen canvas for reading the image
    const srcCanvas = document.createElement("canvas");
    srcCanvas.width = nw;
    srcCanvas.height = nh;
    const srcCtx = srcCanvas.getContext("2d")!;

    // Draw the image onto the source canvas
    await new Promise<void>((resolve) => {
      const tempImg = new Image();
      tempImg.crossOrigin = "anonymous";
      tempImg.onload = () => {
        srcCtx.drawImage(tempImg, 0, 0, nw, nh);
        resolve();
      };
      tempImg.src = imageSrc;
    });

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cropCanvas = document.createElement("canvas");
        cropCanvas.width = cellW;
        cropCanvas.height = cellH;
        const cropCtx = cropCanvas.getContext("2d")!;

        cropCtx.drawImage(
          srcCanvas,
          c * cellW,
          r * cellH,
          cellW,
          cellH,
          0,
          0,
          cellW,
          cellH
        );

        const dataUrl = cropCanvas.toDataURL("image/png");
        const ext = imageFile?.name.split(".").pop() || "png";
        const baseName = imageFile?.name.replace(/\.[^.]+$/, "") || "image";
        results.push({
          id: count,
          dataUrl,
          label: `${baseName}_${count}.${ext}`,
        });
        count++;
      }
    }

    setCroppedImages(results);
    setIsProcessing(false);
  }, [imageSrc, rows, cols, imageFile]);

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
    setRows(3);
    setCols(3);
  }, []);

  return (
    <div className="flex flex-col flex-1 bg-background min-h-screen">
      <div className="w-full max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/"
            className="w-10 h-10 rounded-full flex items-center justify-center border border-card-border bg-card-bg hover:bg-card-border transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Grid Crop</h1>
            <p className="text-sm text-muted">
              Upload an image, set grid lines, and export cropped sections.
            </p>
          </div>
        </div>

        {!imageSrc ? (
          /* Upload Area */
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-20 flex flex-col items-center justify-center cursor-pointer transition-all ${
              isDragging
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
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left: Image + Grid Preview */}
            <div className="flex-1">
              <div className="relative inline-block">
                <img
                  ref={imgRef}
                  src={imageSrc}
                  alt="Uploaded"
                  onLoad={handleImageLoad}
                  className="max-w-full h-auto rounded-lg block"
                  style={{ maxHeight: "70vh" }}
                />
                {/* Grid Overlay */}
                {displaySize.w > 0 && (
                  <svg
                    className="absolute top-0 left-0 pointer-events-none rounded-lg"
                    width={displaySize.w}
                    height={displaySize.h}
                    style={{ mixBlendMode: "difference" }}
                  >
                    {/* Horizontal lines */}
                    {Array.from({ length: rows - 1 }).map((_, i) => (
                      <line
                        key={`h-${i}`}
                        x1={0}
                        y1={((i + 1) * displaySize.h) / rows}
                        x2={displaySize.w}
                        y2={((i + 1) * displaySize.h) / rows}
                        stroke="white"
                        strokeWidth="1.5"
                      />
                    ))}
                    {/* Vertical lines */}
                    {Array.from({ length: cols - 1 }).map((_, i) => (
                      <line
                        key={`v-${i}`}
                        x1={((i + 1) * displaySize.w) / cols}
                        y1={0}
                        x2={((i + 1) * displaySize.w) / cols}
                        y2={displaySize.h}
                        stroke="white"
                        strokeWidth="1.5"
                      />
                    ))}
                    {/* Cell numbers */}
                    {Array.from({ length: rows }).map((_, r) =>
                      Array.from({ length: cols }).map((__, c) => {
                        const num = r * cols + c + 1;
                        const cx = ((c + 0.5) * displaySize.w) / cols;
                        const cy = ((r + 0.5) * displaySize.h) / rows;
                        return (
                          <text
                            key={`n-${r}-${c}`}
                            x={cx}
                            y={cy}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill="white"
                            fontSize="14"
                            fontWeight="bold"
                            style={{ textShadow: "0 0 4px rgba(0,0,0,0.8)" }}
                          >
                            {num}
                          </text>
                        );
                      })
                    )}
                  </svg>
                )}
              </div>
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Right: Controls */}
            <div className="w-full lg:w-72 flex flex-col gap-5">
              {/* Grid controls */}
              <div className="rounded-xl border border-card-border bg-card-bg p-5">
                <h3 className="font-semibold mb-4">Grid Settings</h3>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-muted mb-1 block">
                      Rows: <span className="font-semibold text-foreground">{rows}</span>
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={rows}
                      onChange={(e) => setRows(Number(e.target.value))}
                      className="w-full accent-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted mb-1 block">
                      Columns: <span className="font-semibold text-foreground">{cols}</span>
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={cols}
                      onChange={(e) => setCols(Number(e.target.value))}
                      className="w-full accent-foreground"
                    />
                  </div>
                </div>

                <div className="mt-4 text-xs text-muted">
                  {rows} x {cols} = {rows * cols} sections
                </div>
                {naturalSize.w > 0 && (
                  <div className="mt-1 text-xs text-muted">
                    Each section: {Math.floor(naturalSize.w / cols)} x{" "}
                    {Math.floor(naturalSize.h / rows)} px
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={applyCrop}
                  disabled={isProcessing}
                  className="w-full py-2.5 rounded-lg bg-foreground text-background font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
                >
                  {isProcessing ? "Processing..." : "Apply Crop"}
                </button>
                <button
                  onClick={reset}
                  className="w-full py-2.5 rounded-lg border border-card-border bg-card-bg font-medium text-sm hover:bg-card-border transition-colors cursor-pointer"
                >
                  New Image
                </button>
              </div>

              {/* Cropped Results */}
              {croppedImages.length > 0 && (
                <div className="rounded-xl border border-card-border bg-card-bg p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Results</h3>
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
        )}
      </div>
    </div>
  );
}
