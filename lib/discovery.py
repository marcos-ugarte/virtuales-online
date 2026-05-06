from urllib.parse import urljoin

from scrapling.fetchers import StealthyFetcher


async def find_game_iframes(lobby_url: str, limit: int = 6) -> list[str]:
    """Open the lobby and return the first `limit` unique iframe URLs.

    Relative URLs are resolved against `lobby_url`. Raises RuntimeError when
    fewer than `limit` unique iframes are found, so the caller can fail fast
    and let the user pass URLs manually via --include-game.
    """
    page = await StealthyFetcher.async_fetch(lobby_url, headless=True, network_idle=True)
    seen: list[str] = []
    for el in page.css("iframe[src]"):
        src = el.attrib.get("src")
        if not src:
            continue
        absolute = urljoin(lobby_url, src)
        if absolute not in seen:
            seen.append(absolute)
        if len(seen) >= limit:
            break
    if len(seen) < limit:
        raise RuntimeError(
            f"Found only {len(seen)} iframe(s) in lobby, expected at least {limit}. "
            f"Use --include-game to specify URLs manually."
        )
    return seen
