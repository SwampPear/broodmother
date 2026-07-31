/** The two keys the app is worked by. Everything else is behind the first of them, so
 *  naming the rest here would be a list that goes stale beside the one that runs. */
const KEYS: { key: string; does: string }[] = [
  { key: '⌘K', does: 'Search every document, and run any command' },
  { key: '⌘J', does: 'Show or hide the terminal' },
]

/** What a vault with nothing open shows: the mark, the name, and the two keys. None of it
 *  is a control, so none of it takes a selection or a drag. */
export function HomeView() {
  return (
    <div className="home">
      <img
        className="mark"
        src="/logo.png"
        alt=""
        width={512}
        height={512}
        draggable={false}
      />
      <h1>broodmother</h1>

      <dl className="home-keys">
        {KEYS.map((shortcut) => (
          <div key={shortcut.key}>
            <dt>{shortcut.key}</dt>
            <dd>{shortcut.does}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
