/** What a vault with nothing open shows: the mark, the name, and the one key that opens
 *  everything. None of it is a control, so none of it takes a selection or a drag. */
export function VaultView() {
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
      <p>⌘K opens everything — there is nothing else to click.</p>
    </div>
  )
}
