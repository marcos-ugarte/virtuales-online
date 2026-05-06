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
    """Build a page_action coroutine that intercepts every request via page.route,
    forces a real network fetch (bypassing the browser cache), and saves the body
    to disk before forwarding the response back to the page.

    Why route() and not page.on("response", ...): on a reload the browser may serve
    many assets from cache without firing a "response" event, or fire 304s that have
    no body. route() runs before the cache check, so we always see every request.
    """
    seen: set[str] = set()

    async def page_action(page: Page) -> None:
        async def handle(route) -> None:
            url = route.request.url
            if url.startswith(("data:", "blob:")) or _is_skipped(url, skip_patterns):
                try:
                    await route.continue_()
                except Exception:
                    pass
                return
            try:
                response = await route.fetch()
            except Exception:
                try:
                    await route.continue_()
                except Exception:
                    pass
                return
            try:
                body = await response.body()
            except Exception:
                body = b""
            if 200 <= response.status < 300 and body and url not in seen:
                seen.add(url)
                content_type = response.headers.get("content-type", "application/octet-stream").split(";")[0].strip()
                save_body(url, body, content_type, output_root, manifest)
            try:
                await route.fulfill(response=response, body=body)
            except Exception:
                try:
                    await route.continue_()
                except Exception:
                    pass

        # 1. Install interceptor BEFORE we trigger any (re)requests.
        await page.route("**/*", handle)

        # 2. Reload — every asset goes through our handler, which forces a fresh
        #    network fetch via route.fetch() (no cache reads).
        try:
            await page.reload(wait_until="networkidle", timeout=60_000)
        except Exception:
            # networkidle can occasionally time out on heavy SPAs; we still proceed
            # to scroll/idle-wait so any in-flight requests land in our handler.
            pass

        # 3. Trigger lazy-loaded sprites (parallax, lazy <img>, IntersectionObserver).
        await page.wait_for_timeout(1500)
        try:
            await page.mouse.wheel(0, 2000)
        except Exception:
            pass
        try:
            await page.wait_for_load_state("networkidle", timeout=15_000)
        except Exception:
            pass

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
