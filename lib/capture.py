import asyncio
import re
from pathlib import Path

from playwright.async_api import Page
from scrapling.fetchers import StealthyFetcher

from .storage import Manifest, save_body


def _is_skipped(url: str, skip_patterns: list[str]) -> bool:
    return any(re.search(p, url) for p in skip_patterns)


async def _save_response(response, output_root: Path, manifest: Manifest, skip_patterns: list[str]) -> None:
    """Persist a Playwright Response if it's a successful HTTP fetch we want to keep.

    Filters: non-2xx, data:/blob: URLs, and any URL matching skip_patterns.
    All errors during body retrieval are swallowed (the response may have been
    discarded by the browser before we got to it).
    """
    url = response.url
    if url.startswith("data:") or url.startswith("blob:"):
        return
    if response.status < 200 or response.status >= 300:
        return
    if _is_skipped(url, skip_patterns):
        return
    try:
        body = await response.body()
    except Exception:
        return
    content_type = response.headers.get("content-type", "application/octet-stream").split(";")[0].strip()
    save_body(url, body, content_type, output_root, manifest)


def _record_responses(output_root: Path, manifest: Manifest, skip_patterns: list[str]):
    """Build the page_action coroutine that wires response capture and reload."""
    pending: list[asyncio.Task] = []

    async def page_action(page: Page) -> None:
        def on_response(response) -> None:
            pending.append(asyncio.create_task(
                _save_response(response, output_root, manifest, skip_patterns)
            ))

        # 1. Attach listener BEFORE any (re)issued requests.
        page.on("response", on_response)

        # 2. Reload — every initial asset fires again and is now captured.
        await page.reload(wait_until="networkidle", timeout=60_000)

        # 3. Trigger lazy-loaded sprites (parallax, lazy <img>, IntersectionObserver).
        await page.wait_for_timeout(1500)
        await page.mouse.wheel(0, 2000)
        await page.wait_for_load_state("networkidle")

        # 4. Drain pending save tasks before returning so the manifest is complete.
        if pending:
            await asyncio.gather(*pending, return_exceptions=True)

    return page_action


async def capture_page(
    url: str,
    output_root: Path,
    manifest: Manifest,
    skip_patterns: list[str] | None = None,
) -> None:
    """Open `url` with StealthyFetcher and persist every successful HTTP response."""
    skip = skip_patterns or []
    await StealthyFetcher.async_fetch(
        url,
        headless=True,
        network_idle=True,
        page_action=_record_responses(output_root, manifest, skip),
    )
