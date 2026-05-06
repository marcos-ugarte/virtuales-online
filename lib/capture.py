import re
from pathlib import Path

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
