import { useState } from "react";
import {
  ShoppingBag,
  Package,
  Sparkles,
  Shirt,
  Coffee,
  BookOpen,
  Tag,
} from "lucide-react";

/**
 * High-reliability image component with zero-broken-image guarantee.
 * Automatically displays a sleek category-tailored placeholder if image fails to load.
 */
export default function ImageWithFallback({
  src,
  alt = "Merchandise item",
  className = "w-full h-full object-cover",
  category = "Merchandise",
  containerClassName = "relative w-full aspect-square overflow-hidden bg-slate-100",
}) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Category Icon Resolver for graceful fallback
  const getCategoryIcon = (cat = "") => {
    const c = String(cat).toLowerCase();
    if (c.includes("hoodie") || c.includes("shirt") || c.includes("apparel") || c.includes("sports")) {
      return Shirt;
    }
    if (c.includes("drink") || c.includes("mug") || c.includes("bottle") || c.includes("cup")) {
      return Coffee;
    }
    if (c.includes("stationery") || c.includes("note") || c.includes("book")) {
      return BookOpen;
    }
    if (c.includes("bag") || c.includes("pack") || c.includes("tote")) {
      return Package;
    }
    return ShoppingBag;
  };

  const IconComponent = getCategoryIcon(category);

  // If no source provided or error encountered
  if (!src || error) {
    return (
      <div
        className={`${containerClassName} flex flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-100 via-teal-50/40 to-slate-200 select-none text-slate-400`}
        role="img"
        aria-label={alt}
      >
        <div className="w-14 h-14 rounded-2xl bg-white/80 backdrop-blur-xs border border-teal-100 shadow-xs flex items-center justify-center text-teal-600 mb-2 transition-transform duration-300 group-hover:scale-110">
          <IconComponent className="w-7 h-7" />
        </div>
        <span className="text-[11px] font-bold text-slate-700 text-center line-clamp-1 max-w-[85%]">
          {alt || "EDVEXA Merchandise"}
        </span>
        <span className="text-[10px] font-semibold text-teal-700 uppercase tracking-wider mt-0.5 px-2 py-0.5 rounded-full bg-teal-100/60 border border-teal-200/50">
          {category || "Official Gear"}
        </span>
      </div>
    );
  }

  return (
    <div className={containerClassName}>
      {/* Loading Skeleton Shimmer */}
      {!loaded && (
        <div className="absolute inset-0 bg-slate-200/70 animate-pulse flex items-center justify-center">
          <ShoppingBag className="w-6 h-6 text-slate-300 animate-bounce" />
        </div>
      )}

      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={`${className} transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
