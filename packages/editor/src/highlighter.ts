import { shikiToMonaco, textmateThemeToMonacoTheme } from '@shikijs/monaco'
import type * as Monaco from 'monaco-editor'
import { bundledLanguages, createHighlighter, type Highlighter } from 'shiki'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import { PLAIN, shikiIdFor } from './languages'
import type { MonacoApi } from './monaco'

/** VS Code's own default themes, so the editor looks like the one being imitated. */
export const DARK = 'dark-plus'
export const LIGHT = 'light-plus'

/**
 * The one ground under every document. It is stated as a colour rather than left
 * transparent because Monaco paints more than the text area from the theme — the minimap,
 * the gutter, the sticky header — and a transparent editor over an opaque app leaves those
 * showing VS Code's `#1E1E1E` against broodmother's black. `#0a0a0a` is the app's own
 * `--panel`, which is where this has to agree.
 */
const GROUND = '#0A0A0A'

/**
 * Monaco draws its own scrollbar instead of the browser's, so the app's `--scroll-thumb`
 * cannot reach it and the colour has to be restated here. These are the same two values —
 * `--white` at 10% and at 20% over the ground — so a code file, a note and the terminal all
 * scroll on the same grey. The track is left transparent, as it is everywhere else.
 */
const SLIDER = '#FFFEEE1A'
const SLIDER_HOVER = '#FFFEEE33'

const GROUNDED: Record<string, string> = {
  'editor.background': GROUND,
  'editorGutter.background': GROUND,
  'minimap.background': GROUND,
  'editorStickyScroll.background': GROUND,
  'editorOverviewRuler.background': GROUND,
  'breadcrumb.background': GROUND,
  // Filled rather than outlined: Monaco falls back to drawing a border when the line
  // highlight has no background, and a box around the caret line reads as an error.
  'editor.lineHighlightBackground': '#FFFEEE0A',
  'editor.lineHighlightBorder': '#00000000',
  'scrollbar.shadow': '#00000000',
  'scrollbarSlider.background': SLIDER,
  'scrollbarSlider.hoverBackground': SLIDER_HOVER,
  'scrollbarSlider.activeBackground': SLIDER_HOVER,
}

/** Loaded up front because they are what a vault holds, and what a code fence usually is. */
const SEED = ['markdown', 'json', 'typescript', 'javascript', 'bash', 'python']

let starting: Promise<Highlighter> | null = null
const loaded = new Set<string>(SEED)

/**
 * One highlighter for the app. The JavaScript regex engine is deliberate: the oniguruma one
 * is a WebAssembly binary that has to be fetched, and the desktop app has no network to
 * fetch it over. `forgiving` keeps a grammar whose patterns the JS engine cannot express
 * from taking the editor down with it — that language just highlights less well.
 */
export function highlighter(): Promise<Highlighter> {
  starting ??= createHighlighter({
    themes: [DARK, LIGHT],
    langs: SEED,
    engine: createJavaScriptRegexEngine({ forgiving: true }),
  })
  return starting
}

export function isKnownLanguage(languageId: string): boolean {
  return shikiIdFor(languageId) in bundledLanguages
}

/**
 * Wires Shiki's grammars into Monaco's tokenizer. Monaco tokenizes through whatever was
 * registered last, so this runs again each time a language is added — a file opened in a
 * language nobody has needed yet is the normal way a grammar gets loaded.
 */
export async function useLanguage(
  monaco: MonacoApi,
  languageId: string,
): Promise<boolean> {
  const shiki = await highlighter()
  const shikiId = shikiIdFor(languageId)
  const known = languageId !== PLAIN && shikiId in bundledLanguages

  if (known) {
    if (!loaded.has(shikiId)) {
      await shiki.loadLanguage(shikiId as keyof typeof bundledLanguages)
      loaded.add(shikiId)
    }
    // Monaco has to know the id before a grammar can be bound to it.
    if (!monaco.languages.getLanguages().some((one) => one.id === languageId))
      monaco.languages.register({ id: languageId })
    shikiToMonaco(shiki, monaco as never)
  }

  // Always last: `shikiToMonaco` redefines the themes from Shiki's, which puts VS Code's
  // background back every time a grammar is added.
  paintGround(monaco, shiki)
  return known
}

/** Redefines the dark theme with the app's ground under Shiki's colours. The light one is
 *  left as VS Code has it — a dark ground under it would be the bug this prevents. */
function paintGround(monaco: MonacoApi, shiki: Highlighter): void {
  // `@shikijs/monaco` types against `monaco-editor-core`, which is the same shape under a
  // different name.
  const theme = textmateThemeToMonacoTheme(
    shiki.getTheme(DARK),
  ) as unknown as Monaco.editor.IStandaloneThemeData
  monaco.editor.defineTheme(DARK, {
    ...theme,
    colors: { ...theme.colors, ...GROUNDED },
  })
}
