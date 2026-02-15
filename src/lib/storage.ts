export function getExt(file: File) {
  const parts = file.name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "jpg";
}

export function makeImagePath(ref: string, file: File) {
  const ext = getExt(file);
  const uuid = crypto.randomUUID();
  return `${ref}/${uuid}.${ext}`; // inside bucket "property-images"
}


