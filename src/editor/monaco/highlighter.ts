import { shikiToMonaco, textmateThemeToMonacoTheme } from '@shikijs/monaco'
import type * as Monaco from 'monaco-editor'
import { bundledLanguages, createHighlighter, type Highlighter } from 'shiki'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import type { MonacoApi } from './core'
import { PLAIN, shikiIdFor } from './languages'

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
}

/**
 * Where a difference is said. Monaco paints a changed line end to end, which on a file that
 * differs everywhere — the ordinary case for a branch you have been working on — is a page
 * of red with the writing still to be read through it. The colour goes in the margin
 * instead, a bar beside the line numbers where the `+` and the `−` already are, and the
 * line keeps a wash faint enough to read through so that a word changed mid-line still has
 * somewhere to show.
 *
 * The app's own `--danger` and `--opal-mint`, because a diff is not a different palette.
 */
const DIFF: Record<string, string> = {
  'diffEditor.insertedLineBackground': '#00000000',
  'diffEditor.removedLineBackground': '#00000000',
  'diffEditor.insertedTextBackground': '#34D3991F',
  'diffEditor.removedTextBackground': '#F851491F',
  'diffEditorGutter.insertedLineBackground': '#34D399B3',
  'diffEditorGutter.removedLineBackground': '#F85149B3',
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
function highlighter(): Promise<Highlighter> {
  starting ??= createHighlighter({
    themes: [DARK, LIGHT],
    langs: SEED,
    engine: createJavaScriptRegexEngine({ forgiving: true }),
  })
  return starting
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
    colors: { ...theme.colors, ...GROUNDED, ...DIFF },
  })
}
