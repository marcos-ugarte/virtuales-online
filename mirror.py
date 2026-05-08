import argparse
import asyncio
from pathlib import Path
from urllib.parse import urlparse

from lib.capture import capture_page
from lib.discovery import find_game_iframes
from lib.rewrite import rewrite_mirror
from lib.storage import Manifest

DEFAULT_LOBBY = "https://virtual-games.virtustec.com/demo/desktop/"


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Mirror Virtustec virtual games demo to a local directory.")
    p.add_argument("--lobby", default=DEFAULT_LOBBY, help="Lobby URL to mirror (default: Virtustec desktop demo)")
    p.add_argument("--games", type=int, default=6, help="Number of games to mirror (default: 6)")
    p.add_argument("--out", type=Path, default=Path("./mirror"), help="Output directory (default: ./mirror)")
    p.add_argument("--no-rewrite", action="store_true", help="Skip the URL rewrite pass")
    p.add_argument("--include-game", action="append", default=[], metavar="URL", help="Manually specify a game URL (repeatable). Bypasses discovery.")
    p.add_argument("--skip-game", action="append", default=[], metavar="URL", help="Skip a specific game URL (repeatable)")
    p.add_argument("--skip-asset-pattern", action="append", default=[], metavar="REGEX", help="Skip assets whose URL matches the regex (repeatable)")
    p.add_argument("--capture-seconds", type=int, default=0, metavar="N",
                   help="Keep the page open N extra seconds after load to record WebSocket traffic.")
    return p.parse_args()


async def run(args: argparse.Namespace) -> None:
    args.out.mkdir(parents=True, exist_ok=True)
    manifest = Manifest(args.out)

    # 1. Discovery
    print(f"[1/3] Discovering game iframes from {args.lobby} ...")
    if args.include_game:
        games = args.include_game[: args.games]
    else:
        games = await find_game_iframes(args.lobby, args.games + len(args.skip_game))
        games = [g for g in games if g not in args.skip_game][: args.games]
    print(f"  Found {len(games)} games:")
    for g in games:
        print(f"    - {g}")

    # 2. Capture
    urls = [args.lobby] + games
    print(f"[2/3] Capturing {len(urls)} URLs ...")
    for i, url in enumerate(urls, 1):
        print(f"  [{i}/{len(urls)}] {url}")
        await capture_page(url, args.out, manifest, args.skip_asset_pattern, args.capture_seconds)

    manifest.write()

    # 3. Rewrite
    if not args.no_rewrite:
        print("[3/3] Rewriting absolute URLs ...")
        host = urlparse(args.lobby).netloc
        rewrite_mirror(args.out, host, manifest)
    else:
        print("[3/3] Skipping rewrite (--no-rewrite).")

    print(f"\nDone. {len(manifest.entries)} files saved under {args.out}/")
    print("Verify with: python serve.py")


def main() -> None:
    asyncio.run(run(parse_args()))


if __name__ == "__main__":
    main()
