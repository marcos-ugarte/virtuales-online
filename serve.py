import argparse
import http.server
import socketserver
from functools import partial
from pathlib import Path
from urllib.parse import urlparse

DEFAULT_LOBBY = "https://virtual-games.virtustec.com/demo/desktop/"


def main() -> None:
    p = argparse.ArgumentParser(description="Serve the mirror directory locally.")
    p.add_argument("--root", type=Path, default=Path("mirror"))
    p.add_argument("--port", type=int, default=8000)
    p.add_argument("--lobby", default=DEFAULT_LOBBY, help="Used to print the verification URL")
    args = p.parse_args()

    root = args.root.resolve()
    if not root.exists():
        raise SystemExit(f"Mirror directory not found: {root}. Run mirror.py first.")

    handler = partial(http.server.SimpleHTTPRequestHandler, directory=str(root))
    parsed = urlparse(args.lobby)
    verify_path = f"/{parsed.netloc}{parsed.path}"

    with socketserver.TCPServer(("", args.port), handler) as httpd:
        print(f"Serving {root} at http://localhost:{args.port}/")
        print(f"Open: http://localhost:{args.port}{verify_path}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopped.")


if __name__ == "__main__":
    main()
