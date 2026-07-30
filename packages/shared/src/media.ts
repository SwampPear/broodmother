export const IMAGE_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
}

export function extensionOf(path: string): string {
  const name = path.slice(path.lastIndexOf('/') + 1).toLowerCase()
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot) : ''
}

export function isImage(path: string): boolean {
  return extensionOf(path) in IMAGE_TYPES
}

export function imageTypeOf(path: string): string | null {
  return IMAGE_TYPES[extensionOf(path)] ?? null
}