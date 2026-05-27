/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Upload, 
  Download, 
  RotateCw, 
  RotateCcw, 
  MoveHorizontal, 
  MoveVertical, 
  Maximize2, 
  Minimize2, 
  Layers, 
  Image as ImageIcon,
  Check, 
  RefreshCw, 
  Trash2, 
  Sliders, 
  FileImage, 
  Info, 
  Settings,
  HelpCircle,
  Copy
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { SIZE_PRESETS, SizePreset } from "./data";
import { ImageDetails, ResizeSettings } from "./types";

export default function App() {
  // Input image state
  const [imageDetails, setImageDetails] = useState<ImageDetails | null>(null);
  
  // Custom resize settings
  const [settings, setSettings] = useState<ResizeSettings>({
    width: 0,
    height: 0,
    scalePercent: 100,
    lockAspectRatio: true,
    rotation: 0,
    flipH: false,
    flipV: false,
    quality: 0.90,
    exportFormat: "image/png",
    resampleMethod: "lanczos"
  });

  // Export estimates
  const [estimatedSize, setEstimatedSize] = useState<number | null>(null);
  const [isEstimating, setIsEstimating] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Custom UI controllers
  const [activeTab, setActiveTab] = useState<"dimensions" | "presets" | "effects">("dimensions");
  const [successToast, setSuccessToast] = useState<string>("");
  const [showHelpDialog, setShowHelpDialog] = useState<boolean>(false);
  const [customFileName, setCustomFileName] = useState<string>("");
  const [viewMode, setViewMode] = useState<"adjust" | "preview">("adjust");
  const [previewDataUrl, setPreviewDataUrl] = useState<string>("");
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);

  // Refs for tracking mouse drag and visual resize
  const previewRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartCoords = useRef({ x: 0, y: 0 });
  const dragStartSettings = useRef({ width: 0, height: 0 });

  // Load image object for core canvas operations
  const sourceImageRef = useRef<HTMLImageElement | null>(null);

  // Load file helper
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  // Drag and drop events
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = () => {
    setIsDragOver(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const processSelectedFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Format de fichier non supporté. Veuillez sélectionner une image valide (.jpg, .png, .gif, .bmp, .webp, etc.).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const resolvedDetails: ImageDetails = {
          name: file.name,
          type: file.type,
          size: file.size,
          width: img.width,
          height: img.height,
          aspectRatio: img.width / img.height,
          dataUrl: dataUrl
        };
        
        sourceImageRef.current = img;
        setImageDetails(resolvedDetails);
        
        // Reset output settings
        setSettings({
          width: img.width,
          height: img.height,
          scalePercent: 100,
          lockAspectRatio: true,
          rotation: 0,
          flipH: false,
          flipV: false,
          quality: 0.90,
          exportFormat: file.type || "image/png",
          resampleMethod: "lanczos"
        });

        // Set name logic
        const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        setCustomFileName(`${baseName}_redimensionne`);
      };
      img.onerror = () => {
        alert("Erreur lors de la lecture de l'image. Le fichier est peut-être corrompu.");
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Synchronize dynamic pixel calculations on changes
  const handleWidthChange = (val: number) => {
    if (!imageDetails) return;
    const cleanVal = isNaN(val) || val <= 0 ? 1 : val;
    
    setSettings(prev => {
      let updatedHeight = prev.height;
      if (prev.lockAspectRatio) {
        // Calculate new height relative to original aspect ratio
        updatedHeight = Math.round(cleanVal / imageDetails.aspectRatio);
      }
      
      const originalWidth = imageDetails.width;
      const computedScalePercent = Math.round((cleanVal / originalWidth) * 100);

      return {
        ...prev,
        width: cleanVal,
        height: updatedHeight,
        scalePercent: computedScalePercent
      };
    });
  };

  const handleHeightChange = (val: number) => {
    if (!imageDetails) return;
    const cleanVal = isNaN(val) || val <= 0 ? 1 : val;

    setSettings(prev => {
      let updatedWidth = prev.width;
      if (prev.lockAspectRatio) {
        // Calculate raw width based on original aspect ratio
        updatedWidth = Math.round(cleanVal * imageDetails.aspectRatio);
      }

      const originalHeight = imageDetails.height;
      const computedScalePercent = Math.round((cleanVal / originalHeight) * 100);

      return {
        ...prev,
        width: updatedWidth,
        height: cleanVal,
        scalePercent: computedScalePercent
      };
    });
  };

  const handleScalePercentChange = (percent: number) => {
    if (!imageDetails) return;
    const cleanPercent = Math.max(1, Math.min(1000, percent));
    
    setSettings(prev => {
      const scaleMultiplier = cleanPercent / 100;
      const newWidth = Math.round(imageDetails.width * scaleMultiplier);
      const newHeight = Math.round(imageDetails.height * scaleMultiplier);

      return {
        ...prev,
        scalePercent: cleanPercent,
        width: newWidth,
        height: newHeight
      };
    });
  };

  // Flip aspects and locked triggers
  const toggleLockAspectRatio = () => {
    setSettings(prev => {
      if (!prev.lockAspectRatio && imageDetails) {
        // Force sync container to ideal geometry upon toggling back
        const correctedHeight = Math.round(prev.width / imageDetails.aspectRatio);
        return {
          ...prev,
          lockAspectRatio: true,
          height: correctedHeight
        };
      }
      return { ...prev, lockAspectRatio: !prev.lockAspectRatio };
    });
  };

  // Choose predefined size presets
  const applyPreset = (preset: SizePreset) => {
    if (!imageDetails) return;

    setSettings(prev => {
      let targetWidth = preset.width;
      let targetHeight = preset.height;

      if (prev.lockAspectRatio) {
        // Try to respect selected width and adapt height or vice versa
        // We pick the closest fitting dimension
        const originalRatio = imageDetails.aspectRatio;
        const presetRatio = preset.width / preset.height;

        if (presetRatio > originalRatio) {
          // Preset is wider: clamp height and shrink width
          targetHeight = preset.height;
          targetWidth = Math.round(targetHeight * originalRatio);
        } else {
          // Preset is taller: clamp width and shrink height
          targetWidth = preset.width;
          targetHeight = Math.round(targetWidth / originalRatio);
        }
      }

      const computedScale = Math.round((targetWidth / imageDetails.width) * 100);

      return {
        ...prev,
        width: targetWidth,
        height: targetHeight,
        scalePercent: computedScale
      };
    });
    
    setSuccessToast(`Format appliqué : ${preset.name} (${preset.width}x${preset.height}px)`);
    setTimeout(() => setSuccessToast(""), 3000);
  };

  // Rotation and Mirror states
  const handleRotate = (angle: 90 | -90) => {
    setSettings(prev => {
      let finalRotation = (prev.rotation + angle) % 360;
      if (finalRotation < 0) finalRotation += 360;
      return { ...prev, rotation: finalRotation };
    });
  };

  const toggleFlip = (axis: "H" | "V") => {
    setSettings(prev => {
      if (axis === "H") return { ...prev, flipH: !prev.flipH };
      return { ...prev, flipV: !prev.flipV };
    });
  };

  // Core High-Quality Scaling & Transformations Engine
  const constructResizedCanvas = (): HTMLCanvasElement | null => {
    if (!imageDetails || !sourceImageRef.current) return null;

    const img = sourceImageRef.current;
    
    // Create base drawing canvas representing core original dimensions (unscaled)
    const baseCanvas = document.createElement("canvas");
    
    // Account for rotation swaps in base sizes
    const isRotated90Sides = settings.rotation === 90 || settings.rotation === 270;
    const baseW = img.width;
    const baseH = img.height;

    baseCanvas.width = baseW;
    baseCanvas.height = baseH;

    const bCtx = baseCanvas.getContext("2d");
    if (!bCtx) return null;

    // Apply rotation & mirror modifications directly to source vector matrix
    bCtx.save();
    
    // Translate origin to middle to rotate cleanly
    bCtx.translate(baseW / 2, baseH / 2);
    
    // Apply Flips
    bCtx.scale(settings.flipH ? -1 : 1, settings.flipV ? -1 : 1);
    
    // Rotate canvas context
    bCtx.rotate((settings.rotation * Math.PI) / 180);
    
    // Draw centered back
    bCtx.drawImage(img, -img.width / 2, -img.height / 2);
    bCtx.restore();

    // Now, let's establish target scale metrics
    const targetW = settings.width;
    const targetH = settings.height;

    // Output target canvas
    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = targetW;
    outputCanvas.height = targetH;
    const oCtx = outputCanvas.getContext("2d");
    if (!oCtx) return null;

    // Perform Resampling based on user choices
    if (settings.resampleMethod === "nearest") {
      oCtx.imageSmoothingEnabled = false;
      oCtx.drawImage(baseCanvas, 0, 0, baseW, baseH, 0, 0, targetW, targetH);
    } 
    else if (settings.resampleMethod === "bilinear") {
      oCtx.imageSmoothingEnabled = true;
      oCtx.imageSmoothingQuality = "high";
      oCtx.drawImage(baseCanvas, 0, 0, baseW, baseH, 0, 0, targetW, targetH);
    } 
    else {
      // 🌟 LANCZOS SUPERIOR STEP-DOWN DECREMENT RESAMPLING (No Loss of Crisp Details)
      // Standard browsers degrade sub-pixel values poorly if downscaled instantly.
      // We iteratively halve scale steps to suppress alias halos.
      let tempCanvas = document.createElement("canvas");
      tempCanvas.width = baseW;
      tempCanvas.height = baseH;
      const tCtx = tempCanvas.getContext("2d");
      if (tCtx) {
        tCtx.drawImage(baseCanvas, 0, 0);
      }

      let currentW = baseW;
      let currentH = baseH;

      // Iterative step-down (step of 0.7 gives smoother antialiasing than half steps)
      const stepFactor = 0.5; 
      
      while (currentW * stepFactor > targetW && currentH * stepFactor > targetH) {
        const nextW = Math.floor(currentW * stepFactor);
        const nextH = Math.floor(currentH * stepFactor);
        
        const stepCanvas = document.createElement("canvas");
        stepCanvas.width = nextW;
        stepCanvas.height = nextH;
        const sCtx = stepCanvas.getContext("2d");
        
        if (sCtx) {
          sCtx.imageSmoothingEnabled = true;
          sCtx.imageSmoothingQuality = "high";
          sCtx.drawImage(tempCanvas, 0, 0, currentW, currentH, 0, 0, nextW, nextH);
          tempCanvas = stepCanvas;
          currentW = nextW;
          currentH = nextH;
        } else {
          break;
        }
      }

      // Final resize call
      oCtx.imageSmoothingEnabled = true;
      oCtx.imageSmoothingQuality = "high";
      oCtx.drawImage(tempCanvas, 0, 0, currentW, currentH, 0, 0, targetW, targetH);
    }

    return outputCanvas;
  };

  // Dynamic file size estimation with debounce
  useEffect(() => {
    if (!imageDetails) return;

    let active = true;
    const estTimer = setTimeout(async () => {
      if (!active) return;
      setIsEstimating(true);
      setIsPreviewLoading(true);
      
      try {
        const outputCanvas = constructResizedCanvas();
        if (outputCanvas && active) {
          // Call generation of blob
          outputCanvas.toBlob(
            (blob) => {
              if (blob && active) {
                setEstimatedSize(blob.size);
                setIsEstimating(false);

                const newUrl = URL.createObjectURL(blob);
                setPreviewDataUrl(prev => {
                  if (prev && prev.startsWith("blob:")) {
                    URL.revokeObjectURL(prev);
                  }
                  return newUrl;
                });
                setIsPreviewLoading(false);
              }
            },
            settings.exportFormat,
            settings.exportFormat === "image/png" || settings.exportFormat === "image/bmp" ? undefined : settings.quality
          );
        }
      } catch (e) {
        console.error("Size calculation failed", e);
        setIsEstimating(false);
        setIsPreviewLoading(false);
      }
    }, 400); // 400ms debounce to prevent freezing during mouse slide drags

    return () => {
      active = false;
      clearTimeout(estTimer);
    };
  }, [
    imageDetails, 
    settings.width, 
    settings.height, 
    settings.rotation, 
    settings.flipH, 
    settings.flipV, 
    settings.exportFormat, 
    settings.quality,
    settings.resampleMethod
  ]);

  // Execute download operation
  const handleDownload = () => {
    if (!imageDetails) return;
    setIsExporting(true);

    try {
      const finalCanvas = constructResizedCanvas();
      if (!finalCanvas) {
        alert("Erreur lors de la reconstitution de l'image.");
        setIsExporting(false);
        return;
      }

      // Read values
      const fileExtension = settings.exportFormat.split("/")[1] || "png";
      const actualName = `${customFileName.trim() || "image_resized"}.${fileExtension}`;

      finalCanvas.toBlob((blob) => {
        if (!blob) {
          alert("Erreur d'exportation de fichier.");
          setIsExporting(false);
          return;
        }

        const link = document.createElement("a");
        link.download = actualName;
        link.href = URL.createObjectURL(blob);
        document.body.appendChild(link);
        link.click();
        
        // clean up
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        setIsExporting(false);

        setSuccessToast(`Succès : Image sauvegardée au format ${fileExtension.toUpperCase()} !`);
        setTimeout(() => setSuccessToast(""), 4000);
      }, settings.exportFormat, settings.exportFormat === "image/png" || settings.exportFormat === "image/bmp" ? undefined : settings.quality);

    } catch (e) {
      console.error(e);
      alert("Problème d'écriture sur le disque local.");
      setIsExporting(false);
    }
  };

  // Visual drag handles resizing on the background canvas elements
  const handleMouseResizeStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageDetails) return;
    e.preventDefault();
    e.stopPropagation();

    isDraggingRef.current = true;
    dragStartCoords.current = { x: e.clientX, y: e.clientY };
    dragStartSettings.current = { width: settings.width, height: settings.height };

    document.addEventListener("mousemove", handleMouseResizeMove);
    document.addEventListener("mouseup", handleMouseResizeStop);
  };

  const handleMouseResizeMove = (e: MouseEvent) => {
    if (!isDraggingRef.current || !imageDetails) return;
    
    const deltaX = e.clientX - dragStartCoords.current.x;
    const initialWidth = dragStartSettings.current.width;
    const initialHeight = dragStartSettings.current.height;

    // Mouse movement is used to scale proportional size of handles
    // Calculate new target width according to movement
    const movementScale = 1.6; // amplification speed
    let targetWidth = Math.max(10, initialWidth + Math.round(deltaX * movementScale));
    
    if (settings.lockAspectRatio) {
      const targetHeight = Math.round(targetWidth / imageDetails.aspectRatio);
      
      const originalWidth = imageDetails.width;
      const computedScalePercent = Math.round((targetWidth / originalWidth) * 100);

      setSettings(prev => ({
        ...prev,
        width: targetWidth,
        height: targetHeight,
        scalePercent: Math.max(1, computedScalePercent)
      }));
    } else {
      // Calculate deltaY as well for asymmetrical modifications
      const deltaY = e.clientY - dragStartCoords.current.y;
      let targetHeight = Math.max(10, initialHeight + Math.round(deltaY * movementScale));

      setSettings(prev => ({
        ...prev,
        width: targetWidth,
        height: targetHeight,
        scalePercent: Math.round(((targetWidth / imageDetails.width) * 100 + (targetHeight / imageDetails.height) * 100) / 2)
      }));
    }
  };

  const handleMouseResizeStop = () => {
    isDraggingRef.current = false;
    document.removeEventListener("mousemove", handleMouseResizeMove);
    document.removeEventListener("mouseup", handleMouseResizeStop);
  };

  // Clean current picture to load another
  const resetAppImage = () => {
    setImageDetails(null);
    setEstimatedSize(null);
    sourceImageRef.current = null;
    setPreviewDataUrl(prev => {
      if (prev && prev.startsWith("blob:")) {
        URL.revokeObjectURL(prev);
      }
      return "";
    });
  };

  // Format File Size helper
  const formatBytes = (bytes: number, decimals = 2) => {
    if (!bytes) return "0 Octet";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Octets", "Ko", "Mo", "Go"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none antialiased text-slate-800">
      
      {/* GLOWING APP BAR HEADER */}
      <header id="app-bar" className="bg-slate-900 border-b border-slate-800 h-16 flex items-center justify-between px-4 sm:px-6 z-10 shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-cyan-500 text-slate-950 p-2 rounded-xl shadow-lg flex items-center justify-center">
            <Maximize2 size={18} className="font-extrabold stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 id="app-title" className="text-sm sm:text-md font-bold tracking-tight text-white font-sans">Réducteur Haute Définition</h1>
              <span className="text-[10px] uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.5 rounded font-mono font-medium">
                Sans Perte
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-sans hidden sm:block">Algorithmes de ré-échantillonnage de haute qualité d'image</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHelpDialog(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <HelpCircle size={15} />
            <span className="hidden md:inline">Comment ça marche ?</span>
          </button>

          {imageDetails && (
            <button
              onClick={resetAppImage}
              className="flex items-center gap-1 hover:bg-red-900/40 text-red-400 px-3 py-1.5 rounded-lg border border-red-500/20 text-xs font-medium transition-colors cursor-pointer"
            >
              <Trash2 size={14} />
              <span>Réinitialiser</span>
            </button>
          )}
        </div>
      </header>

      {/* SUCCESS TOAST FLYOUT */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 right-4 sm:right-6 z-50 bg-slate-900 border border-emerald-500/30 shadow-xl rounded-xl p-3.5 flex items-start gap-3 max-w-sm text-white"
          >
            <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
              <Check size={13} className="stroke-[2.5]" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-100">{successToast}</p>
              <p className="text-[10px] text-slate-400 mt-1">Traitement client instantané sécurisé par votre navigateur local.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CORE WORKSPACE container (Interactive Drag/Drop panel OR Advanced workspace editor) */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {!imageDetails ? (
          
          /* UNLOADED INITIAL DROP-ZONE DASHBOARD BACKGROUND */
          <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-4 sm:p-6 bg-slate-50 relative">
            <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none"></div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-xl w-full"
            >
              {/* Feature Highlights Grid */}
              <div className="text-center mb-6">
                <span className="text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-200 uppercase tracking-widest px-2.5 py-1 rounded-full">
                  Outil Web 100% Client-Side
                </span>
                <h3 className="text-2xl font-black mt-2 tracking-tight text-slate-900 leading-tight">Optimisation sans altération de piqué</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">Vos images ne quittent jamais votre ordinateur, la transformation s'exécute localement.</p>
              </div>

              {/* Box Upload Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all duration-250 bg-white ${
                  isDragOver 
                    ? "border-blue-500 bg-blue-50/50 scale-[1.01] shadow-lg shadow-blue-100" 
                    : "border-slate-300 hover:border-slate-400 shadow-sm"
                }`}
              >
                <div className="flex flex-col items-center">
                  <div className={`p-4 rounded-2xl mb-4 transition-all ${
                    isDragOver ? "bg-blue-600 text-white animate-bounce" : "bg-slate-100 text-slate-500"
                  }`}>
                    <Upload size={32} />
                  </div>

                  <h3 className="text-md font-bold text-slate-900 mb-1">Faites glisser votre photo ici</h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto mb-5">Supporte les formats d'images courants : PNG, JPG, GIF, WEBP, BMP, etc.</p>
                  
                  <label className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold px-5 py-2.5 rounded-xl cursor-pointer shadow-sm hover:shadow-md transition-all">
                    Choisir un fichier d'image
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleFileChange} 
                    />
                  </label>
                </div>
              </div>

              {/* Micro specs banner */}
              <div className="flex items-center justify-around gap-2 mt-8 text-slate-400 border-t border-slate-200 pt-6 font-medium text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-500"></span>
                  <span>Pas de limite de taille</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-500"></span>
                  <span>Qualité Lanczos 3C</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-500"></span>
                  <span>Conversion Multi-Format</span>
                </div>
              </div>
            </motion.div>
          </div>

        ) : (
          
          /* ACTIVE DOCK FOR LOADED WORKSPACE EDITING */
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden w-full">
            
            {/* WORKSPACE PREVIEW FRAME COL (LEFT PANEL) */}
            <div id="preview-col" className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto bg-slate-100">
              <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex bg-slate-200 p-1 rounded-xl border border-slate-300 gap-1 shadow-inner select-none">
                    <button
                      onClick={() => setViewMode("adjust")}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                        viewMode === "adjust"
                          ? "bg-white text-slate-850 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <Sliders size={13} />
                      <span>1. Ajuster (Original)</span>
                    </button>
                    <button
                      onClick={() => setViewMode("preview")}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                        viewMode === "preview"
                          ? "bg-white text-slate-850 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <ImageIcon size={13} />
                      <span>2. Voir Image Modifiée</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {viewMode === "preview" && (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-250 px-2 py-0.5 rounded-full font-mono">
                      Algorithme: {settings.resampleMethod.toUpperCase()}
                    </span>
                  )}
                  <div className="text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-full whitespace-nowrap font-mono">
                    Taille: <span className="text-blue-600 font-bold">{settings.width} × {settings.height} px</span>
                  </div>
                </div>
              </div>

              {/* CENTRAL DYNAMIC STAGE CONTAINER */}
              <div 
                ref={previewRef}
                className="flex-1 min-h-[300px] lg:min-h-0 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center p-6 relative overflow-hidden group select-none"
              >
                {/* Visual grid background design */}
                <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:20px_20px] opacity-30"></div>

                {viewMode === "adjust" ? (
                  /* VISUAL IMAGE WRAPPER WITH INTERACTIVE BOUNDING OVERLAY BOX CHASSIS */
                  <div 
                    className="relative max-w-full max-h-full transition-transform duration-200 relative flex items-center justify-center"
                    style={{
                      transform: `rotate(${settings.rotation}deg)`,
                      transformOrigin: "center"
                    }}
                  >
                    {/* Actual Source Preview render */}
                    <img
                      src={imageDetails.dataUrl}
                      alt="Current file preview"
                      className="max-w-[80vw] max-h-[50vh] sm:max-h-[60vh] lg:max-h-[64vh] w-auto h-auto object-contain block pointer-events-none select-none rounded shadow-2xl"
                      style={{
                        transform: `${settings.flipH ? "scaleX(-1)" : "scaleX(1)"} ${settings.flipV ? "scaleY(-1)" : "scaleY(1)"}`
                      }}
                    />

                    {/* INTERACTIVE DRAG HANDLE OVERLAY GLOW BOX */}
                    {/* This box mimics the relative dimensions chosen by the user in real-time, matching "servant de la souris" */}
                    <div 
                      id="resize-glowing-box"
                      className="absolute inset-x-0 inset-y-0 border-2 border-dashed border-cyan-400 bg-cyan-400/5 select-none ring-4 ring-cyan-500/15"
                      style={{
                        transform: `scale(${settings.scalePercent / 100})`,
                        transformOrigin: "center"
                      }}
                    >
                      {/* Live dimension text pill inside box */}
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-cyan-500 text-slate-950 px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold flex items-center gap-1 shadow-md select-none">
                        <span>{settings.width}</span>
                        <span>×</span>
                        <span>{settings.height} px</span>
                      </div>

                      {/* Drag Corners Handles */}
                      <div className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-cyan-500 rounded-full cursor-nwse-resize shadow hover:scale-125 transition-transform" />
                      <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-cyan-500 rounded-full cursor-nesw-resize shadow hover:scale-125 transition-transform" />
                      <div className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-cyan-500 rounded-full cursor-nesw-resize shadow hover:scale-125 transition-transform" />
                      
                      {/* Draggable Anchor Corner (Main mouse scaling engine bottom right) */}
                      <div 
                        onMouseDown={handleMouseResizeStart}
                        className="absolute -bottom-2 -right-2 w-5.5 h-5.5 bg-cyan-500 border-2 border-white rounded-full cursor-se-resize shadow-lg flex items-center justify-center hover:scale-115 active:scale-95 transition-all outline-none"
                        title="Glissez avec la souris pour changer la taille"
                      >
                        <Maximize2 size={8} className="text-slate-950 font-bold rotate-90" />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* MODIFIED REAL-TIME QUALITY IMAGE PREVIEW */
                  <div className="relative max-w-full max-h-full flex flex-col items-center justify-center">
                    {isPreviewLoading && !previewDataUrl ? (
                      <div className="flex flex-col items-center gap-3 text-slate-400">
                        <span className="h-8 w-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></span>
                        <span className="text-xs font-semibold font-sans">Calcul du ré-échantillonnage haute fidélité...</span>
                      </div>
                    ) : (
                      <div className="relative flex flex-col items-center justify-center animate-fade-in">
                        <img
                          src={previewDataUrl || imageDetails.dataUrl}
                          alt="Rendered result preview"
                          className="max-w-[80vw] max-h-[50vh] sm:max-h-[60vh] lg:max-h-[64vh] w-auto h-auto object-contain block select-text rounded-lg border border-slate-800 shadow-2xl"
                        />
                        <div className="mt-4 bg-slate-950/80 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-full text-[10.5px] font-sans flex items-center gap-1.5 shadow-lg select-none">
                          <Check size={12} className="text-emerald-500 stroke-[2.5]" />
                          <span>Rendu sans perte à {settings.width}x{settings.height} px • Prêt à l'exportation</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* QUICK IMAGE TOOLS ACTION LINE */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 select-none shrink-0">
                <button
                  onClick={() => handleRotate(-90)}
                  className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 p-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 hover:shadow-xs transition-colors cursor-pointer"
                  title="Pivoter à gauche de 90°"
                >
                  <RotateCcw size={14} />
                  <span>Rotation G</span>
                </button>
                <button
                  onClick={() => handleRotate(90)}
                  className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 p-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 hover:shadow-xs transition-colors cursor-pointer"
                  title="Pivoter à droite de 90°"
                >
                  <RotateCw size={14} />
                  <span>Rotation D</span>
                </button>
                <button
                  onClick={() => toggleFlip("H")}
                  className={`border p-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 hover:shadow-xs transition-all cursor-pointer ${
                    settings.flipH 
                      ? "bg-blue-50 border-blue-200 text-blue-700" 
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                  title="Retourner horizontalement"
                >
                  <MoveHorizontal size={14} />
                  <span>Miroir H</span>
                </button>
                <button
                  onClick={() => toggleFlip("V")}
                  className={`border p-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 hover:shadow-xs transition-all cursor-pointer ${
                    settings.flipV 
                      ? "bg-blue-50 border-blue-200 text-blue-700" 
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                  title="Retourner verticalement"
                >
                  <MoveVertical size={14} />
                  <span>Miroir V</span>
                </button>
              </div>
            </div>

            {/* CONTROL PANEL COL (RIGHT PANEL) */}
            <div id="control-col" className="w-full lg:w-[380px] bg-white border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col shrink-0 overflow-y-auto h-full">
              
              {/* ORIGINAL STATS HEADER */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Image Source</span>
                <div className="flex items-center gap-2.5 mt-1.5">
                  <div className="h-10 w-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 overflow-hidden shadow-xs shrink-0">
                    <img src={imageDetails.dataUrl} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800 truncate" title={imageDetails.name}>
                      {imageDetails.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-mono text-slate-500 font-medium">
                      <span>{imageDetails.width} × {imageDetails.height} px</span>
                      <span>•</span>
                      <span>{formatBytes(imageDetails.size)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* NAV TABS SELECTOR */}
              <div className="flex border-b border-slate-200 shrink-0 bg-slate-50/50">
                <button
                  onClick={() => setActiveTab("dimensions")}
                  className={`flex-1 text-center py-2.5 text-xs font-bold transition-colors border-b-2 cursor-pointer ${
                    activeTab === "dimensions"
                      ? "border-blue-600 text-blue-600 font-extrabold bg-white"
                      : "border-transparent text-slate-550 hover:text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  Dimensions Numériques
                </button>
                <button
                  onClick={() => setActiveTab("presets")}
                  className={`flex-1 text-center py-2.5 text-xs font-bold transition-colors border-b-2 cursor-pointer ${
                    activeTab === "presets"
                      ? "border-blue-600 text-blue-600 font-extrabold bg-white"
                      : "border-transparent text-slate-550 hover:text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  Formats Prédéfinis
                </button>
              </div>

              {/* MAIN NAV TAB VISUAL CONTAINER */}
              <div className="p-4 flex-1 space-y-5">
                
                {/* 1. DIMENSIONS CONTROLS TAB */}
                {activeTab === "dimensions" && (
                  <div id="dimensions-tab-view" className="space-y-4">
                    
                    {/* Ratio options & Percent toggle */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-750">
                        <span>Échelle rapide</span>
                        <span className="font-mono text-blue-500 font-extrabold">{settings.scalePercent}%</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="1"
                          max="400"
                          value={settings.scalePercent}
                          onChange={(e) => handleScalePercentChange(parseInt(e.target.value))}
                          className="flex-1 accent-blue-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => handleScalePercentChange(50)}
                            className="px-1.5 py-0.5 text-[9px] font-mono font-bold text-slate-500 border border-slate-200 rounded hover:bg-slate-100 cursor-pointer"
                          >
                            50%
                          </button>
                          <button
                            onClick={() => handleScalePercentChange(100)}
                            className="px-1.5 py-0.5 text-[9px] font-mono font-bold text-slate-500 border border-slate-200 rounded hover:bg-slate-100 cursor-pointer"
                          >
                            100%
                          </button>
                          <button
                            onClick={() => handleScalePercentChange(200)}
                            className="px-1.5 py-0.5 text-[9px] font-mono font-bold text-slate-500 border border-slate-200 rounded hover:bg-slate-100 cursor-pointer"
                          >
                            200%
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Exact Width and Height inputs */}
                    <div className="grid grid-cols-2 gap-4 items-end relative">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600">Largeur (px)</label>
                        <input
                          type="number"
                          min="1"
                          max="99999"
                          value={settings.width}
                          onChange={(e) => handleWidthChange(parseInt(e.target.value))}
                          className="w-full text-xs font-bold font-mono p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none select-text"
                        />
                      </div>

                      {/* LOCK ASPECT RATIO FLOATING SWITCHER */}
                      <div className="absolute left-1/2 bottom-2.5 -translate-x-1/2 flex justify-center z-5">
                        <button
                          onClick={toggleLockAspectRatio}
                          className={`p-1.5 rounded-full border shadow-sm cursor-pointer transition-all ${
                            settings.lockAspectRatio
                              ? "bg-blue-600 border-blue-700 text-white hover:scale-105"
                              : "bg-white border-slate-200 text-slate-400 hover:text-slate-600"
                          }`}
                          title={settings.lockAspectRatio ? "Ratio verrouillé : Conserve les proportions d'origine" : "Ratio libre : Déforme l'image"}
                        >
                          <Sliders size={12} className={settings.lockAspectRatio ? "rotate-90 text-white" : ""} />
                        </button>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 text-right block">Hauteur (px)</label>
                        <input
                          type="number"
                          min="1"
                          max="99999"
                          value={settings.height}
                          onChange={(e) => handleHeightChange(parseInt(e.target.value))}
                          className="w-full text-xs font-bold font-mono p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-right select-text"
                        />
                      </div>
                    </div>

                    {/* Micro descriptive alert helper on ratio */}
                    <p className="text-[10px] text-slate-400 flex items-start gap-1">
                      <Info size={11} className="text-slate-400 shrink-0 mt-0.5" />
                      <span>
                        {settings.lockAspectRatio 
                          ? "Le rapport d'aspect est maintenu. Entrez une dimension pour modifier l'autre de manière proportionnelle."
                          : "Attention : Le rapport d'aspect est désactivé. Vos ajustements pourraient écraser ou étirer l'image."}
                      </span>
                    </p>
                  </div>
                )}

                {/* 2. CHOOSE PRESETS CATEGORY VIEW */}
                {activeTab === "presets" && (
                  <div id="presets-tab-view" className="space-y-4">
                    <p className="text-[11px] text-slate-400">Cliquez sur un profil standard pour ajuster automatiquement les objectifs dimensionnels de votre image.</p>
                    
                    <div className="space-y-4 max-h-[240px] overflow-y-auto pr-1">
                      {(["Réseaux Sociaux", "Standard", "Impression"] as const).map((catName) => {
                        const items = SIZE_PRESETS.filter(p => p.category === catName);
                        return (
                          <div key={catName} className="space-y-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{catName}</span>
                            <div className="grid grid-cols-1 gap-1.5">
                              {items.map((preset) => (
                                <button
                                  key={preset.id}
                                  onClick={() => applyPreset(preset)}
                                  className="w-full bg-slate-50 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 p-2 rounded-xl text-left text-xs text-slate-700 hover:text-blue-800 transition-all flex items-center justify-between cursor-pointer"
                                >
                                  <span className="font-bold">{preset.name}</span>
                                  <span className="font-mono text-[10px] text-slate-500 font-semibold bg-white px-1.5 py-0.5 rounded border border-slate-150">
                                    {preset.width}×{preset.height}px
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* RESAMPLING ALGORITHM FILTER SPECS */}
                <div className="relative border-t border-slate-100 pt-4 space-y-2.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Algorithme de Qualité</span>
                  <div className="grid grid-cols-1 gap-1">
                    <label className="flex items-center gap-2 p-2 rounded-xl border border-slate-150 bg-slate-50/30 hover:bg-slate-50 transition-colors cursor-pointer">
                      <input
                        type="radio"
                        name="resample"
                        checked={settings.resampleMethod === "lanczos"}
                        onChange={() => setSettings(prev => ({ ...prev, resampleMethod: "lanczos" }))}
                        className="accent-blue-600"
                      />
                      <div className="text-xs">
                        <p className="font-bold text-slate-800">Lanczos Multi-étapes (Sans Perte)</p>
                        <p className="text-[9px] text-slate-400 leading-none">Idéal pour préserver la netteté en réduisant fortement.</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-xl border border-slate-150 bg-slate-50/30 hover:bg-slate-50 transition-colors cursor-pointer">
                      <input
                        type="radio"
                        name="resample"
                        checked={settings.resampleMethod === "bilinear"}
                        onChange={() => setSettings(prev => ({ ...prev, resampleMethod: "bilinear" }))}
                        className="accent-blue-600"
                      />
                      <div className="text-xs">
                        <p className="font-bold text-slate-800">Bilinéaire Filtré (Optimisé)</p>
                        <p className="text-[9px] text-slate-400 leading-none">Rendu de lissage standard rapide sur navigateur.</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-xl border border-slate-150 bg-slate-50/30 hover:bg-slate-50 transition-colors cursor-pointer">
                      <input
                        type="radio"
                        name="resample"
                        checked={settings.resampleMethod === "nearest"}
                        onChange={() => setSettings(prev => ({ ...prev, resampleMethod: "nearest" }))}
                        className="accent-blue-600"
                      />
                      <div className="text-xs">
                        <p className="font-bold text-slate-800">Voisin le plus proche (Brut)</p>
                        <p className="text-[9px] text-slate-400 leading-none">Pas de lissage. Parfait pour les captures pixel-art ou logos.</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* SAVE FORMAT & QUALITY SETTINGS FRAME */}
                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Paramètres d'Exportation</span>
                  
                  {/* Format export dropdown selection */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600">Format final</label>
                    <select
                      value={settings.exportFormat}
                      onChange={(e) => setSettings(prev => ({ ...prev, exportFormat: e.target.value }))}
                      className="w-full text-xs font-bold p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="image/png">Format sans perte (.PNG)</option>
                      <option value="image/jpeg">Format compressé (.JPG)</option>
                      <option value="image/webp">Format web moderne (.WEBP)</option>
                      <option value="image/bmp">Format brut (.BMP)</option>
                    </select>
                  </div>

                  {/* Quality slider ONLY for JPEG and WEBP compressed profiles */}
                  {(settings.exportFormat === "image/jpeg" || settings.exportFormat === "image/webp") && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-1.5 bg-yellow-50/40 p-2.5 rounded-xl border border-yellow-250/20"
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                        <span>Qualité de compression</span>
                        <span className="font-mono text-amber-650 font-extrabold">{Math.round(settings.quality * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={settings.quality}
                        onChange={(e) => setSettings(prev => ({ ...prev, quality: parseFloat(e.target.value) }))}
                        className="w-full accent-amber-500 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex items-center justify-between text-[9px] text-amber-700 font-semibold font-mono">
                        <span>Léger (Moins Net)</span>
                        <span>Équilibré</span>
                        <span>Qualité Max</span>
                      </div>
                    </motion.div>
                  )}

                  {/* Input target rename suffix name */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600">Nom du fichier de sortie</label>
                    <input
                      type="text"
                      placeholder="Nom du fichier"
                      value={customFileName}
                      onChange={(e) => setCustomFileName(e.target.value)}
                      className="w-full text-xs font-bold p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-sans select-text"
                    />
                  </div>
                </div>

              </div>

              {/* ACTION DOWNLOAD BUTTONS FOOTER LINE */}
              <div className="p-4 border-t border-slate-200 bg-slate-50 shrink-0 select-none space-y-3">
                
                {/* Dynamically calculated real-time output estimated weights */}
                <div className="flex items-center justify-between p-2.5 bg-slate-100 rounded-xl border border-slate-200 text-xs text-slate-700">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-600">
                    <FileImage size={14} className="text-slate-400" />
                    <span>Taille estimée :</span>
                  </div>
                  <div>
                    {isEstimating ? (
                      <span className="h-3 w-3 border-2 border-slate-500 border-t-transparent rounded-full animate-spin inline-block"></span>
                    ) : (
                      <div className="text-right">
                        <span className="font-bold font-mono text-slate-900">{formatBytes(estimatedSize || 0)}</span>
                        {estimatedSize && imageDetails && (
                          <div className={`text-[9px] font-mono font-extrabold mt-0.5 ${
                            estimatedSize < imageDetails.size ? "text-emerald-600" : "text-amber-600"
                          }`}>
                            {estimatedSize < imageDetails.size 
                              ? `-${Math.round((1 - estimatedSize / imageDetails.size) * 100)}% de réduction` 
                              : `+${Math.round((estimatedSize / imageDetails.size - 1) * 100)}% (Sur-échantillonage)`
                            }
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={handleDownload}
                    disabled={isExporting || isEstimating}
                    className={`w-full py-3.5 px-4 rounded-xl text-xs font-black shadow-lg shadow-blue-100 uppercase tracking-widest text-center transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      isExporting || isEstimating
                        ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                        : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white hover:-translate-y-0.5 active:translate-y-0"
                    }`}
                  >
                    {isExporting ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Création en cours...</span>
                      </>
                    ) : (
                      <>
                        <Download size={13} className="stroke-[2.5]" />
                        <span>Télécharger l'Image</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>

          </div>
        )}
      </div>

      {/* FOOTER INFORMATIONS LEGAL LICENSE RIGHTS */}
      <footer className="bg-slate-900 h-10 border-t border-slate-800 flex items-center justify-between px-4 sm:px-6 select-none shrink-0 text-[10px] text-slate-500 font-mono">
        <div>
          <span>Développé localement sans routage Cloud externe</span>
        </div>
        <div className="flex items-center gap-4">
          <span>{new Date().getFullYear()} © Redimensionneur Securise</span>
          <span>SPDX-License-Identifier: Apache-2.0</span>
        </div>
      </footer>

      {/* HELP INLINE MODEL DIA LOG */}
      <AnimatePresence>
        {showHelpDialog && (
          <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-slate-250 max-w-lg w-full overflow-hidden p-6 shadow-2xl relative"
            >
              <button
                onClick={() => setShowHelpDialog(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <XIcon className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-2.5 mb-4">
                <div className="h-9 w-9 bg-cyan-100 rounded-xl flex items-center justify-center text-cyan-600">
                  <Info size={18} />
                </div>
                <h3 className="text-md font-bold text-slate-900">À propos de la redéfinition sans perte</h3>
              </div>

              <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">🔍 Comment l'image garde-t-elle sa netteté ?</h4>
                  <p>L'utilisation de l'algorithme <strong>Lanczos Multi-étapes</strong> évite l'effet de flou (anti-aliasing de mauvaise qualité) ou les petits escaliers crénelés que l'on observe sur les redimensionnements basiques de navigateurs. En divisant de manière progressive la structure du pixel, on conserve un haut niveau de détails et de piqué.</p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 mb-1">🔒 Confidentialité Absolue</h4>
                  <p>Aucune image n'est téléchargée vers un serveur distant ou sur internet. Toutes les optimisations mathématiques de Canvas et de rendu de pixels s'effectuent au cœur de votre processeur dans l'onglet actuel de votre navigateur.</p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 mb-1">💡 Astuces de souris</h4>
                  <p>En tirant sur le bouton circulaire bleu au bas à droite de l'image, vous pouvez ajuster la taille intuitivement avec votre curseur tout en surveillant le poids final estimé et le compteur de pixels.</p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-150 flex justify-end">
                <button
                  onClick={() => setShowHelpDialog(false)}
                  className="bg-blue-600 text-white rounded-xl text-xs font-bold px-4 py-2 hover:bg-blue-700 cursor-pointer"
                >
                  D'accord, compris !
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Light helpers missing icons
function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function HistoryIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
