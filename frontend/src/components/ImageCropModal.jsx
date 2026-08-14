import { useState, useRef, useEffect, useCallback } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw, Check, Move, Sparkles } from "lucide-react";

/**
 * ImageCropModal
 * WhatsApp / Instagram style 4:5 fixed-frame pan & zoom image cropper.
 *
 * - Aspect Ratio: 4:5 (Standard Lucky Couture couture gallery & details ratio)
 * - Canvas Export: High-resolution WebP/JPEG (1080x1350 max, preserving source resolution)
 * - Mouse & Touch Pan / Zoom with boundary constraints
 */
export default function ImageCropModal({
  file,
  onComplete,
  onCancel,
  aspectRatio = 4 / 5,
  title = "Crop & Position Photo",
  subtitle = "Drag to position the design inside the frame. Zoom to adjust framing.",
}) {
  const containerRef = useRef(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [cropBox, setCropBox] = useState({ width: 0, height: 0, x: 0, y: 0 });
  
  // Transform state: position (px offset from center of crop box) & scale
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(1);
  const [maxScale, setMaxScale] = useState(4);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // Drag tracking
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, startOffsetX: 0, startOffsetY: 0 });

  // Pinch zoom tracking for mobile
  const pinchStartRef = useRef({ dist: 0, startScale: 1 });

  // 1. Read file into object URL
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
      setImageSrc(url);
    };
    img.src = url;

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  // 2. Measure container and compute crop frame dimensions
  const updateDimensions = useCallback(() => {
    if (!containerRef.current || !naturalSize.width || !naturalSize.height) return;
    const rect = containerRef.current.getBoundingClientRect();
    const padding = 24;
    const availWidth = Math.max(100, rect.width - padding * 2);
    const availHeight = Math.max(100, rect.height - padding * 2);

    let boxWidth = availWidth;
    let boxHeight = boxWidth / aspectRatio;

    if (boxHeight > availHeight) {
      boxHeight = availHeight;
      boxWidth = boxHeight * aspectRatio;
    }

    const boxX = (rect.width - boxWidth) / 2;
    const boxY = (rect.height - boxHeight) / 2;

    setCropBox({ width: boxWidth, height: boxHeight, x: boxX, y: boxY });

    // Initial scale: fit to cover crop frame without empty gaps
    const scaleX = boxWidth / naturalSize.width;
    const scaleY = boxHeight / naturalSize.height;
    const calculatedMinScale = Math.max(scaleX, scaleY);

    setMinScale(calculatedMinScale);
    setMaxScale(Math.max(calculatedMinScale * 4, 3));
    setScale(calculatedMinScale);
    setOffset({ x: 0, y: 0 });
  }, [naturalSize, aspectRatio]);

  useEffect(() => {
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [updateDimensions]);

  // 3. Clamp offset so image always completely covers the crop box
  const clampOffset = useCallback(
    (newX, newY, currentScale) => {
      if (!cropBox.width || !naturalSize.width) return { x: newX, y: newY };
      const scaledW = naturalSize.width * currentScale;
      const scaledH = naturalSize.height * currentScale;

      const maxOffsetX = Math.max(0, (scaledW - cropBox.width) / 2);
      const maxOffsetY = Math.max(0, (scaledH - cropBox.height) / 2);

      return {
        x: Math.max(-maxOffsetX, Math.min(maxOffsetX, newX)),
        y: Math.max(-maxOffsetY, Math.min(maxOffsetY, newY)),
      };
    },
    [cropBox, naturalSize]
  );

  // Mouse handlers
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startOffsetX: offset.x,
      startOffsetY: offset.y,
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const targetX = dragStartRef.current.startOffsetX + dx;
    const targetY = dragStartRef.current.startOffsetY + dy;
    setOffset(clampOffset(targetX, targetY, scale));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers (drag & pinch zoom)
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        startOffsetX: offset.x,
        startOffsetY: offset.y,
      };
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      pinchStartRef.current = { dist, startScale: scale };
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 1 && isDragging) {
      const dx = e.touches[0].clientX - dragStartRef.current.x;
      const dy = e.touches[0].clientY - dragStartRef.current.y;
      const targetX = dragStartRef.current.startOffsetX + dx;
      const targetY = dragStartRef.current.startOffsetY + dy;
      setOffset(clampOffset(targetX, targetY, scale));
    } else if (e.touches.length === 2 && pinchStartRef.current.dist > 0) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const ratio = dist / pinchStartRef.current.dist;
      const newScale = Math.min(maxScale, Math.max(minScale, pinchStartRef.current.startScale * ratio));
      setScale(newScale);
      setOffset((prev) => clampOffset(prev.x, prev.y, newScale));
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    pinchStartRef.current = { dist: 0, startScale: scale };
  };

  // Wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomStep = 0.08 * (scale / minScale);
    const newScale = e.deltaY < 0 ? Math.min(maxScale, scale + zoomStep) : Math.max(minScale, scale - zoomStep);
    setScale(newScale);
    setOffset((prev) => clampOffset(prev.x, prev.y, newScale));
  };

  const handleSliderZoom = (val) => {
    const newScale = Number(val);
    setScale(newScale);
    setOffset((prev) => clampOffset(offset.x, offset.y, newScale));
  };

  const handleReset = () => {
    setScale(minScale);
    setOffset({ x: 0, y: 0 });
  };

  // 4. Generate final cropped image on high-res canvas
  const handleCropComplete = () => {
    if (!imageSrc || !naturalSize.width || !naturalSize.height || !cropBox.width) return;

    // Target output dimensions (e.g. 1080x1350 or source scaled up to 1440x1800)
    const outWidth = Math.min(1200, Math.max(800, Math.round(naturalSize.width)));
    const outHeight = Math.round(outWidth / aspectRatio);

    const canvas = document.createElement("canvas");
    canvas.width = outWidth;
    canvas.height = outHeight;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    // Quality settings
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Ratio of display crop box to canvas
    const canvasScale = outWidth / cropBox.width;

    // In display space, image center is at (cropBox.width/2 + offset.x, cropBox.height/2 + offset.y)
    // and scaled by `scale`.
    const imgDisplayWidth = naturalSize.width * scale;
    const imgDisplayHeight = naturalSize.height * scale;

    const imgDisplayLeft = (cropBox.width - imgDisplayWidth) / 2 + offset.x;
    const imgDisplayTop = (cropBox.height - imgDisplayHeight) / 2 + offset.y;

    // Map display pixels to canvas pixels
    const canvasDrawX = imgDisplayLeft * canvasScale;
    const canvasDrawY = imgDisplayTop * canvasScale;
    const canvasDrawW = imgDisplayWidth * canvasScale;
    const canvasDrawH = imgDisplayHeight * canvasScale;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      ctx.drawImage(img, canvasDrawX, canvasDrawY, canvasDrawW, canvasDrawH);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            onCancel();
            return;
          }
          const croppedFileName = file.name.replace(/\.[^/.]+$/, "") + "-cropped.webp";
          const croppedFile = new File([blob], croppedFileName, {
            type: "image/webp",
            lastModified: Date.now(),
          });
          onComplete(croppedFile);
        },
        "image/webp",
        0.92
      );
    };
    img.src = imageSrc;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl bg-[#18181b] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-white flex items-center gap-2">
              <Sparkles size={16} className="text-accent" />
              {title}
            </h3>
            <p className="text-[11px] text-white/50">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Viewport Area */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
          className="relative flex-1 min-h-[320px] sm:min-h-[420px] bg-black select-none overflow-hidden cursor-grab active:cursor-grabbing flex items-center justify-center"
        >
          {/* Background dimmed layer with exact cutout for crop box */}
          {cropBox.width > 0 && imageSrc && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.75)`,
                width: `${cropBox.width}px`,
                height: `${cropBox.height}px`,
                left: `${cropBox.x}px`,
                top: `${cropBox.y}px`,
                zIndex: 20,
              }}
            >
              {/* Highlight border */}
              <div className="w-full h-full border-2 border-accent rounded-xl shadow-lg relative">
                {/* Rule of thirds grid overlay */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                  <div className="border-r border-b border-white/30" />
                  <div className="border-r border-b border-white/30" />
                  <div className="border-b border-white/30" />
                  <div className="border-r border-b border-white/30" />
                  <div className="border-r border-b border-white/30" />
                  <div className="border-b border-white/30" />
                  <div className="border-r border-white/30" />
                  <div className="border-r border-white/30" />
                  <div />
                </div>

                {/* 4:5 indicator tag */}
                <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 backdrop-blur-sm text-accent text-[10px] font-bold rounded-md uppercase tracking-wider">
                  4:5 Frame
                </span>

                {/* Drag helper tooltip */}
                <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 bg-black/70 backdrop-blur-sm text-white/80 text-[10px] font-medium rounded-md">
                  <Move size={10} /> Drag to adjust
                </span>
              </div>
            </div>
          )}

          {/* Movable Image */}
          {imageSrc && cropBox.width > 0 && (
            <div
              className="absolute pointer-events-none transition-transform duration-75"
              style={{
                width: `${naturalSize.width * scale}px`,
                height: `${naturalSize.height * scale}px`,
                left: `${cropBox.x + (cropBox.width - naturalSize.width * scale) / 2 + offset.x}px`,
                top: `${cropBox.y + (cropBox.height - naturalSize.height * scale) / 2 + offset.y}px`,
                zIndex: 10,
              }}
            >
              <img
                src={imageSrc}
                alt="Crop preview"
                className="w-full h-full object-fill pointer-events-none"
                draggable={false}
              />
            </div>
          )}
        </div>

        {/* Toolbar & Controls */}
        <div className="p-4 sm:px-6 sm:py-4 bg-[#202024] border-t border-white/10 space-y-3 shrink-0">
          {/* Zoom Slider */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const newScale = Math.max(minScale, scale - 0.2);
                setScale(newScale);
                setOffset((prev) => clampOffset(prev.x, prev.y, newScale));
              }}
              disabled={scale <= minScale + 0.01}
              className="p-1.5 text-white/70 hover:text-white disabled:opacity-30 transition-colors"
              title="Zoom out"
            >
              <ZoomOut size={16} />
            </button>

            <input
              type="range"
              min={minScale}
              max={maxScale}
              step={(maxScale - minScale) / 100}
              value={scale}
              onChange={(e) => handleSliderZoom(e.target.value)}
              className="flex-1 accent-accent h-1.5 bg-white/20 rounded-lg cursor-pointer"
            />

            <button
              type="button"
              onClick={() => {
                const newScale = Math.min(maxScale, scale + 0.2);
                setScale(newScale);
                setOffset((prev) => clampOffset(prev.x, prev.y, newScale));
              }}
              disabled={scale >= maxScale - 0.01}
              className="p-1.5 text-white/70 hover:text-white disabled:opacity-30 transition-colors"
              title="Zoom in"
            >
              <ZoomIn size={16} />
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="p-1.5 text-white/70 hover:text-accent transition-colors ml-1"
              title="Reset zoom & position"
            >
              <RotateCcw size={15} />
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleCropComplete}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-accent text-white text-xs sm:text-sm font-semibold rounded-xl hover:bg-accent/85 transition-all shadow-md active:scale-95"
            >
              <Check size={16} />
              Crop &amp; Use Photo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
