export function basename(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1)
}

/** Lowercase and without the dot, so `a/b.PNG` is `png`. Empty for a dotfile or a name
 *  with no extension at all. */
export function extensionOf(path: string): string {
  const name = basename(path).toLowerCase()
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot + 1) : ''
}
