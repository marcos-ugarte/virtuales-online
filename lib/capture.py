import base64
import json
import re
import time
from pathlib import Path
from urllib.parse import urlparse

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


def _ws_host_dir(ws_url: str) -> str:
    """Return the host (with port if non-default) from a WebSocket URL.

    wss://example.com/path      -> example.com
    wss://example.com:8443/path -> example.com:8443
    """
    parsed = urlparse(ws_url)
    host = parsed.hostname or "unknown"
    port = parsed.port
    # Default ports for ws/wss
    scheme = parsed.scheme.lower()
    default_port = 443 if scheme == "wss" else 80
    if port and port != default_port:
        return f"{host}:{port}"
    return host


def _record_frame(
    ws_url: str,
    direction: str,
    payload,
    output_root: Path,
    ws_state: dict,
) -> None:
    """Write a single WebSocket frame as a JSONL line to the appropriate file.

    ws_state is a mutable dict with keys:
      - "counter": int  — next connection ID to assign
      - "url_to_id": dict[str, int]  — maps ws_url -> assigned ID
    """
    # Assign a stable integer ID to each unique WebSocket URL/connection.
    url_to_id = ws_state["url_to_id"]
    if ws_url not in url_to_id:
        url_to_id[ws_url] = ws_state["counter"]
        ws_state["counter"] += 1
    conn_id = url_to_id[ws_url]

    host_dir = _ws_host_dir(ws_url)
    ws_dir = output_root / host_dir / "_websocket"
    ws_dir.mkdir(parents=True, exist_ok=True)
    file_path = ws_dir / f"ws-{conn_id}.jsonl"

    if isinstance(payload, (bytes, bytearray)):
        payload_str = base64.b64encode(payload).decode("ascii")
        is_binary = True
    else:
        payload_str = payload
        is_binary = False

    record = {
        "timestamp": time.time(),
        "direction": direction,
        "url": ws_url,
        "payload": payload_str,
        "binary": is_binary,
    }
    with open(file_path, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(record) + "\n")


def _record_responses(
    output_root: Path,
    manifest: Manifest,
    skip_patterns: list[str],
    capture_seconds: int = 0,
):
    """Build a page_action coroutine that intercepts every request via page.route,
    forces a real network fetch (bypassing the browser cache), and saves the body
    to disk before forwarding the response back to the page.

    Additionally installs a WebSocket listener that records every frame sent and
    received to per-connection JSONL files under <output_root>/<host>/_websocket/.

    Why route() and not page.on("response", ...): on a reload the browser may serve
    many assets from cache without firing a "response" event, or fire 304s that have
    no body. route() runs before the cache check, so we always see every request.
    """
    seen: set[str] = set()

    async def page_action(page: Page) -> None:
        # --- WebSocket capture setup ---
        ws_state: dict = {"counter": 0, "url_to_id": {}}

        def on_ws(ws) -> None:
            ws_url = ws.url

            ws.on(
                "framesent",
                lambda payload: _record_frame(ws_url, "sent", payload, output_root, ws_state),
            )
            ws.on(
                "framereceived",
                lambda payload: _record_frame(ws_url, "received", payload, output_root, ws_state),
            )
            ws.on(
                "close",
                lambda _ws=ws: None,  # intentional no-op; hook for future logging
            )

        page.on("websocket", on_ws)

        # --- HTTP capture setup ---
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

        # 4. Extra dwell time to capture WebSocket traffic.
        if capture_seconds > 0:
            await page.wait_for_timeout(capture_seconds * 1000)

    return page_action


async def capture_page(
    url: str,
    output_root: Path,
    manifest: Manifest,
    skip_patterns: list[str] | None = None,
    capture_seconds: int = 0,
) -> None:
    """Open `url` with StealthyFetcher and persist every successful HTTP response.

    If capture_seconds > 0, the page is kept alive that many extra seconds so
    that WebSocket frames (and any late-arriving HTTP responses) can be recorded.
    """
    skip = skip_patterns or []
    await StealthyFetcher.async_fetch(
        url,
        headless=True,
        network_idle=True,
        page_action=_record_responses(output_root, manifest, skip, capture_seconds),
    )
