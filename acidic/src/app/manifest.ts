import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return { id: "/", name: "Acidic · Acidity Bar & Coffee", short_name: "Acidic", description: "Programme, stocktake, roster and money for Acidity", start_url: "/dashboard", scope: "/", display: "standalone", background_color: "#15130f", theme_color: "#15130f", icons: [{ src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" }] };
}
