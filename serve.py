import argparse
import http.server
import socketserver
from functools import partial
from pathlib import Path
from urllib.parse import urlparse

DEFAULT_LOBBY = "https://virtual-games.virtustec.com/demo/desktop/"


def main() -> None:
    p = argparse.ArgumentParser(description="Serve the mirror directory locally.")
    p.add_argument("--mirror", type=Path, default=Path("mirror"), help="Path to the mirror dir produced by mirror.py")
    p.add_argument("--port", type=int, default=8000)
    p.add_argument("--lobby", default=DEFAULT_LOBBY, help="Lobby URL — its host's subdir under --mirror is the doc root")
    p.add_argument("--root", type=Path, default=None, help="Override the doc root (advanced)")
    args = p.parse_args()

    parsed = urlparse(args.lobby)
    host = parsed.netloc

    # Default doc root is mirror/<host>/ so root-relative paths in the captured
    # HTML (e.g. /desktop/default/foo.js) resolve to mirror/<host>/desktop/default/foo.js.
    root = (args.root or args.mirror / host).resolve()
    if not root.exists():
        raise SystemExit(f"Mirror root not found: {root}. Run mirror.py first.")

    handler = partial(http.server.SimpleHTTPRequestHandler, directory=str(root))
    verify_path = parsed.path or "/"

    with socketserver.TCPServer(("", args.port), handler) as httpd:
        print(f"Serving {root} at http://localhost:{args.port}/")
        print(f"Open: http://localhost:{args.port}{verify_path}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopped.")


if __name__ == "__main__":
    main()
