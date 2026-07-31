/** The opalescent palette profile colours are drawn from. */
export const opal = [
  { name: 'violet', hex: '#c084fc' },
  { name: 'indigo', hex: '#818cf8' },
  { name: 'cyan', hex: '#22d3ee' },
  { name: 'mint', hex: '#34d399' },
  { name: 'rose', hex: '#f472b6' },
  { name: 'gold', hex: '#b39051' },
  { name: 'navy', hex: '#051e39' },
] as const

export type OpalColor = (typeof opal)[number]

/** The palette rotated to lead with `hex`: a colour picker opens on the colour you are,
 *  and reads round from there rather than making you find yourself in the middle. */
export function opalFrom(hex: string | undefined): OpalColor[] {
  const start = opal.findIndex((color) => color.hex === hex)
  return start < 1 ? [...opal] : [...opal.slice(start), ...opal.slice(0, start)]
}
