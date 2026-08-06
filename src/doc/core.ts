// The exact markdown subset. Plan 01 serializes this set and plan 02 lets the user type
// this set — that pairing is what makes round-tripping lossless, so it lives here and
// nowhere else. Adding a member is a shared-types change, not a package change.
export const SCHEMA_SPEC = {
  nodes: [
    'doc',
    'paragraph',
    'text',
    'heading',
    'bulletList',
    'orderedList',
    'listItem',
    'taskList',
    'taskItem',
    'codeBlock',
    'math',
    'mathBlock',
    'blockquote',
    'table',
    'tableRow',
    'tableCell',
    'tableHeader',
    'horizontalRule',
    'image',
  ],
  // Canonical nesting order, outermost first. Both packages sort to this, so a given mark
  // set has exactly one tree spelling.
  marks: ['link', 'wikiLink', 'bold', 'italic', 'strike', 'code'],
  headingLevels: [1, 2, 3, 4],
} as const
