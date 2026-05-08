from pathlib import Path
from urllib.parse import urlparse
import json


def url_to_path(url: str, output_root: Path) -> Path:
    """Map a URL to a deterministic on-disk path under output_root.

    Query strings are dropped — for static assets they are cache-busters
    (?v=3.1.25) that don't change the body, and stripping them keeps the
    on-disk path matching what `http.server` looks up (which ignores query
    strings). If two URLs ever map to the same path with different content,
    save_body's idempotency means the first one wins.

    Examples:
      https://host.com/demo/desktop/  -> output_root/host.com/demo/desktop/index.html
      https://host.com/styles.css     -> output_root/host.com/styles.css
      https://host.com/a.js?v=1       -> output_root/host.com/a.js
    """
    parsed = urlparse(url)
    host = parsed.netloc
    path = parsed.path or "/"
    if path.endswith("/"):
        path = path + "index.html"
    rel = path.lstrip("/")
    return output_root / host / rel


class Manifest:
    def __init__(self, output_root: Path):
        self.output_root = output_root
        self.entries: list[dict] = []
        self._seen: set[str] = set()

    def add(self, url: str, path: Path, body_size: int, content_type: str) -> None:
        if url in self._seen:
            return
        self._seen.add(url)
        self.entries.append({
            "url": url,
            "path": str(path.relative_to(self.output_root)).replace("\\", "/"),
            "bytes": body_size,
            "content_type": content_type,
        })

    def write(self) -> None:
        manifest_file = self.output_root / "manifest.json"
        manifest_file.write_text(json.dumps(self.entries, indent=2), encoding="utf-8")


def save_body(
    url: str,
    body: bytes,
    content_type: str,
    output_root: Path,
    manifest: Manifest,
) -> Path:
    """Save body to the path computed from url. Idempotent: if the path already exists,
    leaves the file alone and does not duplicate the manifest entry."""
    path = url_to_path(url, output_root)
    if path.exists():
        return path
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(body)
    manifest.add(url, path, len(body), content_type)
    return path
