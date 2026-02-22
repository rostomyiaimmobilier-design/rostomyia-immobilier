type PropertyImageUrlOptions = {
  width?: number;
  height?: number;
  quality?: number;
  resize?: "cover" | "contain" | "fill";
  format?: "origin" | "webp";
};

export function propertyImageUrl(path: string, options?: PropertyImageUrlOptions) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base || !path) return "";

  const cleanPath = String(path).replace(/^\/+/, "");

  if (!options || Object.values(options).every((v) => v == null)) {
    return `${base}/storage/v1/object/public/property-images/${cleanPath}`;
  }

  const params = new URLSearchParams();
  if (options.width) params.set("width", String(options.width));
  if (options.height) params.set("height", String(options.height));
  if (options.quality) params.set("quality", String(options.quality));
  if (options.resize) params.set("resize", options.resize);
  // Some Supabase projects reject `format=webp` with HTTP 400.
  // Keep transform active but skip webp unless explicitly allowed.
  const allowWebp = process.env.NEXT_PUBLIC_SUPABASE_ALLOW_WEBP_RENDER === "1";
  if (options.format === "origin") params.set("format", "origin");
  if (options.format === "webp" && allowWebp) params.set("format", "webp");

  const query = params.toString();
  const suffix = query ? `?${query}` : "";
  return `${base}/storage/v1/render/image/public/property-images/${cleanPath}${suffix}`;
}

export function propertyImageBlurDataURL() {
  const svg =
    "<svg xmlns='http://www.w3.org/2000/svg' width='40' height='30' viewBox='0 0 40 30'><defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'><stop stop-color='#f2e6cf' offset='0'/><stop stop-color='#d9dde6' offset='1'/></linearGradient></defs><rect width='40' height='30' fill='url(#g)'/></svg>";
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
