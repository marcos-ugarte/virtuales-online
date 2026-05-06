import re
from pathlib import Path

from .storage import Manifest

_TEXT_PREFIXES = ("text/", "application/javascript", "application/json", "application/xml")


def is_text(content_type: str) -> bool:
    return any(content_type.startswith(t) for t in _TEXT_PREFIXES)


def rewrite_text(content: str, host: str) -> str:
    """Replace `https://{host}` and `http://{host}` with `/{host}` so absolute
    references resolve under any local static server rooted at the mirror dir."""
    pattern = re.compile(r"https?://" + re.escape(host))
    return pattern.sub(f"/{host}", content)


def rewrite_mirror(output_root: Path, host: str, manifest: Manifest) -> None:
    """Walk every text response in the manifest and rewrite absolute URLs in place."""
    for entry in manifest.entries:
        if not is_text(entry["content_type"]):
            continue
        path = output_root / entry["path"]
        try:
            content = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, FileNotFoundError):
            continue
        new = rewrite_text(content, host)
        if new != content:
            path.write_text(new, encoding="utf-8")
