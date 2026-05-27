export interface SizePreset {
  id: string;
  name: string;
  width: number;
  height: number;
  category: "Réseaux Sociaux" | "Standard" | "Impression";
}

export const SIZE_PRESETS: SizePreset[] = [
  // Social Media
  { id: "fb-cover", name: "Facebook Couverture", width: 851, height: 315, category: "Réseaux Sociaux" },
  { id: "insta-post", name: "Instagram Carré (1:1)", width: 1080, height: 1080, category: "Réseaux Sociaux" },
  { id: "insta-story", name: "Instagram Story (9:16)", width: 1080, height: 1920, category: "Réseaux Sociaux" },
  { id: "yt-thumb", name: "YouTube Miniature (16:9)", width: 1280, height: 720, category: "Réseaux Sociaux" },
  { id: "linkedin-banner", name: "LinkedIn Bannière", width: 1584, height: 396, category: "Réseaux Sociaux" },

  // Standard Screen Sizes
  { id: "4k", name: "Ultra HD (4K)", width: 3840, height: 2160, category: "Standard" },
  { id: "fhd", name: "Full HD (1080p)", width: 1920, height: 1080, category: "Standard" },
  { id: "hd", name: "HD (720p)", width: 1280, height: 720, category: "Standard" },
  { id: "vga", name: "Classic VGA", width: 640, height: 480, category: "Standard" },

  // Print Sizes (at standard 300 DPI approximation)
  { id: "a4", name: "Format A4 (300 DPI)", width: 2480, height: 3508, category: "Impression" },
  { id: "a5", name: "Format A5 (300 DPI)", width: 1748, height: 2480, category: "Impression" },
  { id: "photo-standard", name: "Photo Standard (10x15cm)", width: 1181, height: 1772, category: "Impression" }
];
