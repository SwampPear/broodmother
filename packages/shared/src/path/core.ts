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

/**
 * A path as it is shown rather than as it is used. Everyone writes their home as `~`, every
 * tool prints it that way, and the twenty characters in front of it say only that the
 * machine has more than one user.
 */
export function tilde(path: string): string {
  return path.replace(/^\/(?:Users|home)\/[^/]+\//, '~/')
}
