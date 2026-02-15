export function propertyImageUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return ""; // prevents undefined/... bugs
  return `${base}/storage/v1/object/public/property-images/${path}`;
}
