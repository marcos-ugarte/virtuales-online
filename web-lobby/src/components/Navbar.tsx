/**
 * Navbar — port of the custom-lobby nav bar.
 * Pure presentational component with mock user data.
 */
export function Navbar() {
  return (
    <nav
      className="navbar navbar-expand-lg navbar-dark bg-dark"
      role="navigation"
      aria-label="Main navigation"
    >
      <a className="navbar-brand" href="./">
        <img src="/assets/goldenrace_logo.svg" alt="Golden Race" width="128" height="28" />
      </a>

      <button
        className="navbar-toggler"
        type="button"
        data-toggle="collapse"
        data-target="#main-menu"
        aria-controls="main-menu"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span className="navbar-toggler-icon"></span>
      </button>

      <div className="collapse navbar-collapse" id="main-menu">
        <ul className="navbar-nav mr-auto" role="list"></ul>

        {/* Mock user info */}
        <div className="navbar-user">
          <span className="fa fa-user" aria-hidden="true"></span>
          <span className="user-name">demo-player-01</span>
          <span className="user-balance" title="Available balance" aria-label="Balance: 1,000.00 EUR">
            &euro;&nbsp;1,000.00
          </span>
          <button className="btn btn-outline-light btn-sm" type="button" aria-label="Sign out">
            Sign out&nbsp;<span className="fa fa-sign-out" aria-hidden="true"></span>
          </button>
        </div>
      </div>
    </nav>
  );
}
