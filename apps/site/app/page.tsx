export default function Page() {
  return (
    <main>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="logo" src="/logo.png" alt="" width={56} height={56} />
      <h1>mother</h1>
      <p className="tagline">
        Plain markdown files in a git repo you own — a documentation app that never holds
        your work hostage.
      </p>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="shot"
        src="/screenshot.png"
        alt="mother open on a vault: file tree, tabs, a rendered markdown note, and a terminal panel"
        width={2000}
        height={1158}
      />

      <div className="box">
        <pre>
          <span className="prompt">$ </span>npm i -g @mother/cli{'\n'}
          <span className="prompt">$ </span>mother
        </pre>
      </div>

      <footer>then open 127.0.0.1:6767</footer>
    </main>
  )
}
