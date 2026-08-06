/**
 * The vault this window is standing in, read off the address bar. It is a fact about the
 * page load: every in-app route keeps the parameter, and moving to another vault is a full
 * load on purpose — everything the page holds is about the vault it was loaded for. Null
 * is a window bound to whatever vault the server opened last, which adopts it on arrival.
 */
export function windowVault(): string | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('vault')
}

/** A route with the window's vault kept on it, so in-app navigation stays in place. */
export function withVault(route: string): string {
  const vault = windowVault()
  if (!vault) return route
  return `${route}${route.includes('?') ? '&' : '?'}vault=${encodeURIComponent(vault)}`
}

/** The address that stands a window in a vault, or in none — the first-run state. */
export function vaultHref(vault: string | null): string {
  return vault ? `/?vault=${encodeURIComponent(vault)}` : '/'
}

/** Full-load navigation, routed through one object so a test can stand in for a browser
 *  that will not actually leave the page. */
export const browse = {
  assign(url: string): void {
    window.location.assign(url)
  },
  replace(url: string): void {
    window.location.replace(url)
  },
  newWindow(url: string): void {
    window.open(url, '_blank')
  },
}
