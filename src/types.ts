export interface ImageDetails {
  name: string;
  type: string;
  size: number; // in bytes
  width: number;
  height: number;
  aspectRatio: number;
  dataUrl: string;
}

export interface ResizeSettings {
  width: number;
  height: number;
  scalePercent: number;
  lockAspectRatio: boolean;
  rotation: number; // 0, 90, 180, 270
  flipH: boolean;
  flipV: boolean;
  quality: number; // 0 to 1 for jpeg/webp
  exportFormat: string; // 'image/png' | 'image/jpeg' | 'image/webp' | 'image/bmp'
  resampleMethod: "lanczos" | "bilinear" | "nearest";
}
