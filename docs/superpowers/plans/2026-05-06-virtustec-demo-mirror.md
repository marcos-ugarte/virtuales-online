# Virtustec Virtual Games — Static Mirror Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a CLI tool that produces a static mirror of `https://virtual-games.virtustec.com/demo/desktop/` plus 6 game iframes, served locally and modifiable afterwards.

**Architecture:** Scrapling's `StealthyFetcher.async_fetch` drives a real browser; `page_action` exposes the underlying Playwright `Page`, where we attach `page.on("response", …)` and reload to capture every HTTP response. Pure helpers (path mapping, regex rewriting, manifest) are unit-tested; network-dependent pieces use mocked Scrapling for unit tests and a manual smoke test for end-to-end.

**Tech Stack:** Python 3.11+, Scrapling (already installed in `venv/`), Playwright (transitive), pytest + pytest-asyncio for tests, stdlib `argparse` and `http.server` for CLI/serving.

**Spec:** `docs/superpowers/specs/2026-05-06-virtustec-demo-mirror-design.md`

---

## File Structure

```
GoldenRaceScrapping/
├── mirror.py                # CLI orchestrator
├── serve.py                 # local static server
├── lib/
│   ├── __init__.py          # empty
│   ├── storage.py           # url_to_path, save_body, Manifest
│   ├── rewrite.py           # rewrite_text, rewrite_mirror
│   ├── discovery.py         # find_game_iframes (async)
│   └── capture.py           # capture_page, _save_response, _is_skipped
├── tests/
│   ├── __init__.py          # empty
│   ├── test_storage.py
│   ├── test_rewrite.py
│   ├── test_discovery.py
│   └── test_capture.py
├── docs/superpowers/{specs,plans}/...
├── mirror/                  # output (gitignored)
├── .gitignore
├── pytest.ini
└── venv/                    # gitignored
```

---

## Task 1: Project scaffolding

Set up directories, gitignore, dev dependencies, and initialize git.

**Files:**
- Create: `lib/__init__.py` (empty)
- Create: `tests/__init__.py` (empty)
- Create: `.gitignore`
- Create: `pytest.ini`

- [ ] **Step 1: Create lib/ and tests/ packages**

```bash
mkdir -p lib tests
touch lib/__init__.py tests/__init__.py
```

- [ ] **Step 2: Write `.gitignore`**

```
venv/
__pycache__/
*.pyc
.pytest_cache/
mirror/
.DS_Store
```

- [ ] **Step 3: Write `pytest.ini`**

```ini
[pytest]
asyncio_mode = auto
testpaths = tests
python_files = test_*.py
```

- [ ] **Step 4: Install dev dependencies**

Activate the existing venv and install:

```bash
# Windows
.\venv\Scripts\activate
pip install pytest pytest-asyncio
```

If on git-bash on Windows: `source venv/Scripts/activate`.

- [ ] **Step 5: Verify pytest runs**

Run: `pytest --collect-only`
Expected: "no tests ran" / "0 collected" without errors.

- [ ] **Step 6: Initialize git and first commit**

```bash
git init
git add .gitignore pytest.ini lib/__init__.py tests/__init__.py demo_scrapling.py test_golden.py renderizado.html docs/
git commit -m "chore: initial scaffold for mirror tool"
```

---

## Task 2: storage.url_to_path

Pure function: map a URL to a deterministic on-disk path under `output_root`.

**Files:**
- Create: `lib/storage.py`
- Create: `tests/test_storage.py`

- [ ] **Step 1: Write the failing test**

Append to `tests/test_storage.py`:

```python
from pathlib import Path
from lib.storage import url_to_path


def test_url_to_path_simple_file():
    assert url_to_path("https://example.com/foo.css", Path("/m")) == Path("/m/example.com/foo.css")


def test_url_to_path_directory_gets_index_html():
    assert url_to_path("https://example.com/demo/desktop/", Path("/m")) == Path("/m/example.com/demo/desktop/index.html")


def test_url_to_path_root_gets_index_html():
    assert url_to_path("https://example.com/", Path("/m")) == Path("/m/example.com/index.html")


def test_url_to_path_with_query_uses_suffix():
    assert url_to_path("https://example.com/a.js?v=1", Path("/m")) == Path("/m/example.com/a.js@v-1")


def test_url_to_path_with_multi_query():
    assert url_to_path("https://example.com/a?x=1&y=2", Path("/m")) == Path("/m/example.com/a@x-1_y-2")


def test_url_to_path_preserves_subdomains():
    assert url_to_path("https://cdn.example.com/a.png", Path("/m")) == Path("/m/cdn.example.com/a.png")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_storage.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'lib.storage'`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/storage.py`:

```python
from pathlib import Path
from urllib.parse import urlparse


def url_to_path(url: str, output_root: Path) -> Path:
    """Map a URL to a deterministic on-disk path under output_root.

    Examples:
      https://host.com/demo/desktop/  -> output_root/host.com/demo/desktop/index.html
      https://host.com/styles.css     -> output_root/host.com/styles.css
      https://host.com/a?v=1          -> output_root/host.com/a@v-1
    """
    parsed = urlparse(url)
    host = parsed.netloc
    path = parsed.path or "/"
    if path.endswith("/"):
        path = path + "index.html"
    rel = path.lstrip("/")
    if parsed.query:
        suffix = "@" + parsed.query.replace("&", "_").replace("=", "-")
        rel = rel + suffix
    return output_root / host / rel
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_storage.py -v`
Expected: 6 PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/storage.py tests/test_storage.py
git commit -m "feat(storage): map URLs to deterministic on-disk paths"
```

---

## Task 3: storage.save_body and Manifest

Persist response bodies to disk and track them in a JSON manifest.

**Files:**
- Modify: `lib/storage.py` (append)
- Modify: `tests/test_storage.py` (append)

- [ ] **Step 1: Write the failing tests**

Append to `tests/test_storage.py`:

```python
import json
from lib.storage import save_body, Manifest


def test_manifest_records_entries(tmp_path):
    manifest = Manifest(tmp_path)
    save_body("https://x.com/a.css", b"body{}", "text/css", tmp_path, manifest)
    assert len(manifest.entries) == 1
    e = manifest.entries[0]
    assert e["url"] == "https://x.com/a.css"
    assert e["bytes"] == 6
    assert e["content_type"] == "text/css"
    assert e["path"] == "x.com/a.css"


def test_save_body_writes_file_to_disk(tmp_path):
    manifest = Manifest(tmp_path)
    save_body("https://x.com/a.css", b"body{}", "text/css", tmp_path, manifest)
    assert (tmp_path / "x.com" / "a.css").read_bytes() == b"body{}"


def test_save_body_creates_intermediate_dirs(tmp_path):
    manifest = Manifest(tmp_path)
    save_body("https://x.com/deep/nested/a.css", b"x", "text/css", tmp_path, manifest)
    assert (tmp_path / "x.com" / "deep" / "nested" / "a.css").read_bytes() == b"x"


def test_save_body_is_idempotent(tmp_path):
    manifest = Manifest(tmp_path)
    save_body("https://x.com/a.css", b"first", "text/css", tmp_path, manifest)
    save_body("https://x.com/a.css", b"second", "text/css", tmp_path, manifest)
    assert (tmp_path / "x.com" / "a.css").read_bytes() == b"first"
    assert len(manifest.entries) == 1


def test_manifest_write_produces_json(tmp_path):
    manifest = Manifest(tmp_path)
    save_body("https://x.com/a.css", b"body{}", "text/css", tmp_path, manifest)
    manifest.write()
    data = json.loads((tmp_path / "manifest.json").read_text())
    assert data[0]["url"] == "https://x.com/a.css"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_storage.py -v`
Expected: 5 new tests FAIL with `ImportError: cannot import name 'save_body'`.

- [ ] **Step 3: Write the implementation**

Append to `lib/storage.py`:

```python
import json


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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_storage.py -v`
Expected: 11 PASS total (6 from Task 2 + 5 new).

- [ ] **Step 5: Commit**

```bash
git add lib/storage.py tests/test_storage.py
git commit -m "feat(storage): persist response bodies with manifest"
```

---

## Task 4: rewrite.rewrite_text and rewrite_mirror

Rewrite absolute URLs in saved text files to root-relative paths.

**Files:**
- Create: `lib/rewrite.py`
- Create: `tests/test_rewrite.py`

- [ ] **Step 1: Write the failing tests**

Create `tests/test_rewrite.py`:

```python
import json
from pathlib import Path
from lib.rewrite import rewrite_text, rewrite_mirror, is_text
from lib.storage import Manifest, save_body


def test_rewrite_in_html():
    out = rewrite_text('<link href="https://x.com/a.css">', "x.com")
    assert out == '<link href="/x.com/a.css">'


def test_rewrite_in_css_url():
    out = rewrite_text('background: url(https://x.com/font.woff);', "x.com")
    assert out == 'background: url(/x.com/font.woff);'


def test_rewrite_handles_http_and_https():
    out = rewrite_text('http://x.com/a https://x.com/b', "x.com")
    assert out == '/x.com/a /x.com/b'


def test_rewrite_keeps_other_hosts():
    out = rewrite_text('https://other.com/foo https://x.com/bar', "x.com")
    assert out == 'https://other.com/foo /x.com/bar'


def test_rewrite_no_change_when_host_absent():
    src = '<a href="/local">x</a>'
    assert rewrite_text(src, "x.com") == src


def test_is_text_recognizes_common_types():
    assert is_text("text/html")
    assert is_text("text/css; charset=utf-8")
    assert is_text("application/javascript")
    assert is_text("application/json")
    assert not is_text("image/png")
    assert not is_text("font/woff2")


def test_rewrite_mirror_walks_text_files(tmp_path):
    manifest = Manifest(tmp_path)
    save_body("https://x.com/a.css", b'@import "https://x.com/b.css";', "text/css", tmp_path, manifest)
    save_body("https://x.com/img.png", b"\x89PNG\r\n", "image/png", tmp_path, manifest)
    rewrite_mirror(tmp_path, "x.com", manifest)
    assert (tmp_path / "x.com" / "a.css").read_text() == '@import "/x.com/b.css";'
    # Binary file untouched
    assert (tmp_path / "x.com" / "img.png").read_bytes() == b"\x89PNG\r\n"


def test_rewrite_mirror_skips_undecodable(tmp_path):
    """Files with text/* content-type but invalid UTF-8 should be left alone, not crash."""
    manifest = Manifest(tmp_path)
    save_body("https://x.com/weird.css", b"\xff\xfe garbage", "text/css", tmp_path, manifest)
    rewrite_mirror(tmp_path, "x.com", manifest)  # must not raise
    assert (tmp_path / "x.com" / "weird.css").read_bytes() == b"\xff\xfe garbage"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_rewrite.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'lib.rewrite'`.

- [ ] **Step 3: Write the implementation**

Create `lib/rewrite.py`:

```python
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_rewrite.py -v`
Expected: 8 PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/rewrite.py tests/test_rewrite.py
git commit -m "feat(rewrite): rewrite absolute URLs in saved text files"
```

---

## Task 5: discovery.find_game_iframes

Async function that opens the lobby with `StealthyFetcher` and pulls iframe URLs from the rendered DOM.

**Files:**
- Create: `lib/discovery.py`
- Create: `tests/test_discovery.py`

- [ ] **Step 1: Write the failing tests**

Create `tests/test_discovery.py`:

```python
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from lib.discovery import find_game_iframes


def _fake_page(iframe_srcs):
    elements = [MagicMock(attrib={"src": s}) for s in iframe_srcs]
    page = MagicMock()
    page.css.return_value = elements
    return page


@pytest.mark.asyncio
@patch("lib.discovery.StealthyFetcher")
async def test_returns_first_n_unique_iframes(fetcher):
    fetcher.async_fetch = AsyncMock(return_value=_fake_page([
        "https://x.com/g1/", "https://x.com/g2/", "https://x.com/g3/",
        "https://x.com/g4/", "https://x.com/g5/", "https://x.com/g6/",
        "https://x.com/g7/",
    ]))
    result = await find_game_iframes("https://lobby.com/", limit=3)
    assert result == ["https://x.com/g1/", "https://x.com/g2/", "https://x.com/g3/"]


@pytest.mark.asyncio
@patch("lib.discovery.StealthyFetcher")
async def test_deduplicates_repeats(fetcher):
    fetcher.async_fetch = AsyncMock(return_value=_fake_page([
        "https://a/", "https://a/", "https://b/", "https://c/",
    ]))
    result = await find_game_iframes("https://lobby.com/", limit=2)
    assert result == ["https://a/", "https://b/"]


@pytest.mark.asyncio
@patch("lib.discovery.StealthyFetcher")
async def test_resolves_relative_iframe_src(fetcher):
    fetcher.async_fetch = AsyncMock(return_value=_fake_page([
        "/games/derby/", "./games/spin/",
    ]))
    result = await find_game_iframes("https://lobby.com/demo/desktop/", limit=2)
    assert result == [
        "https://lobby.com/games/derby/",
        "https://lobby.com/demo/desktop/games/spin/",
    ]


@pytest.mark.asyncio
@patch("lib.discovery.StealthyFetcher")
async def test_raises_when_too_few_found(fetcher):
    fetcher.async_fetch = AsyncMock(return_value=_fake_page(["https://only/"]))
    with pytest.raises(RuntimeError, match="Found only 1"):
        await find_game_iframes("https://lobby.com/", limit=6)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_discovery.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'lib.discovery'`.

- [ ] **Step 3: Write the implementation**

Create `lib/discovery.py`:

```python
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_discovery.py -v`
Expected: 4 PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/discovery.py tests/test_discovery.py
git commit -m "feat(discovery): find game iframe URLs in the rendered lobby"
```

---

## Task 6: capture helpers (`_is_skipped`, `_save_response`)

Pure-ish helpers extracted from the capture orchestration so they can be unit-tested without spinning up a browser.

**Files:**
- Create: `lib/capture.py`
- Create: `tests/test_capture.py`

- [ ] **Step 1: Write the failing tests**

Create `tests/test_capture.py`:

```python
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import pytest

from lib.capture import _is_skipped, _save_response
from lib.storage import Manifest


def test_is_skipped_matches_pattern():
    assert _is_skipped("https://x.com/big.mp4", [r"\.mp4$"])
    assert _is_skipped("https://x.com/big.mp4?v=1", [r"\.mp4(\?|$)"])
    assert not _is_skipped("https://x.com/img.png", [r"\.mp4$"])


def test_is_skipped_empty_patterns():
    assert not _is_skipped("https://x.com/anything", [])


def _fake_response(url, status=200, body=b"x", content_type="text/css"):
    r = MagicMock()
    r.url = url
    r.status = status
    r.headers = {"content-type": content_type}
    r.body = AsyncMock(return_value=body)
    return r


@pytest.mark.asyncio
async def test_save_response_persists_2xx(tmp_path):
    manifest = Manifest(tmp_path)
    await _save_response(_fake_response("https://x.com/a.css"), tmp_path, manifest, [])
    assert (tmp_path / "x.com" / "a.css").read_bytes() == b"x"
    assert manifest.entries[0]["url"] == "https://x.com/a.css"


@pytest.mark.asyncio
async def test_save_response_skips_non_2xx(tmp_path):
    manifest = Manifest(tmp_path)
    await _save_response(_fake_response("https://x.com/redir", status=302), tmp_path, manifest, [])
    await _save_response(_fake_response("https://x.com/missing", status=404), tmp_path, manifest, [])
    assert manifest.entries == []


@pytest.mark.asyncio
async def test_save_response_skips_data_and_blob_urls(tmp_path):
    manifest = Manifest(tmp_path)
    await _save_response(_fake_response("data:image/png;base64,AAAA"), tmp_path, manifest, [])
    await _save_response(_fake_response("blob:abc"), tmp_path, manifest, [])
    assert manifest.entries == []


@pytest.mark.asyncio
async def test_save_response_honors_skip_patterns(tmp_path):
    manifest = Manifest(tmp_path)
    await _save_response(_fake_response("https://x.com/big.mp4"), tmp_path, manifest, [r"\.mp4$"])
    assert manifest.entries == []


@pytest.mark.asyncio
async def test_save_response_strips_charset_from_content_type(tmp_path):
    manifest = Manifest(tmp_path)
    await _save_response(
        _fake_response("https://x.com/a.css", content_type="text/css; charset=utf-8"),
        tmp_path, manifest, [],
    )
    assert manifest.entries[0]["content_type"] == "text/css"


@pytest.mark.asyncio
async def test_save_response_swallows_body_errors(tmp_path):
    """If response.body() raises (e.g. response was discarded), skip silently."""
    manifest = Manifest(tmp_path)
    r = _fake_response("https://x.com/a.css")
    r.body = AsyncMock(side_effect=Exception("body gone"))
    await _save_response(r, tmp_path, manifest, [])  # must not raise
    assert manifest.entries == []
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_capture.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'lib.capture'`.

- [ ] **Step 3: Write the implementation**

Create `lib/capture.py`:

```python
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_capture.py -v`
Expected: 8 PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/capture.py tests/test_capture.py
git commit -m "feat(capture): response filtering and persistence helper"
```

---

## Task 7: capture.capture_page

Wire the helpers into the real `page_action` flow — attach listener, reload, scroll, drain pending saves.

**Files:**
- Modify: `lib/capture.py` (append)
- Modify: `tests/test_capture.py` (append)

- [ ] **Step 1: Write the failing test**

Append to `tests/test_capture.py`:

```python
import asyncio
from unittest.mock import patch


@pytest.mark.asyncio
async def test_capture_page_attaches_listener_then_reloads(tmp_path):
    """Verify capture_page wires page_action correctly: listener attached, then
    reload triggers it with each fake response, and bodies end up on disk."""
    manifest = Manifest(tmp_path)

    fake_responses = [
        _fake_response("https://x.com/a.css", content_type="text/css"),
        _fake_response("https://x.com/b.js", body=b"alert(1)", content_type="application/javascript"),
    ]

    fake_page = MagicMock()
    listener = {"cb": None}

    def on(event, cb):
        if event == "response":
            listener["cb"] = cb

    async def reload(**kwargs):
        assert listener["cb"] is not None, "listener must be attached before reload"
        for r in fake_responses:
            listener["cb"](r)
        # Allow scheduled save tasks to run
        await asyncio.sleep(0)
        await asyncio.sleep(0)

    fake_page.on = on
    fake_page.reload = reload
    fake_page.wait_for_timeout = AsyncMock()
    fake_page.wait_for_load_state = AsyncMock()
    fake_page.mouse = MagicMock()
    fake_page.mouse.wheel = AsyncMock()

    async def fake_async_fetch(url, page_action=None, **kw):
        await page_action(fake_page)

    from lib import capture as capture_mod

    with patch.object(capture_mod.StealthyFetcher, "async_fetch", side_effect=fake_async_fetch):
        await capture_mod.capture_page("https://x.com/", tmp_path, manifest, skip_patterns=[])

    # Both bodies on disk
    assert (tmp_path / "x.com" / "a.css").read_bytes() == b"x"
    assert (tmp_path / "x.com" / "b.js").read_bytes() == b"alert(1)"
    assert {e["url"] for e in manifest.entries} == {"https://x.com/a.css", "https://x.com/b.js"}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_capture.py::test_capture_page_attaches_listener_then_reloads -v`
Expected: FAIL with `AttributeError: module 'lib.capture' has no attribute 'capture_page'` (or `StealthyFetcher`).

- [ ] **Step 3: Write the implementation**

Append to `lib/capture.py`:

```python
import asyncio

from playwright.async_api import Page
from scrapling.fetchers import StealthyFetcher


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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_capture.py -v`
Expected: 9 PASS total.

- [ ] **Step 5: Commit**

```bash
git add lib/capture.py tests/test_capture.py
git commit -m "feat(capture): full page capture via Scrapling page_action + reload"
```

---

## Task 8: mirror.py CLI

Tie discovery + capture + rewrite together with an `argparse` CLI.

**Files:**
- Create: `mirror.py`

- [ ] **Step 1: Write the implementation**

Create `mirror.py`:

```python
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
        await capture_page(url, args.out, manifest, args.skip_asset_pattern)

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
```

- [ ] **Step 2: Verify the CLI parses without errors**

Run: `python mirror.py --help`
Expected: prints the help text listing all flags. No traceback.

- [ ] **Step 3: Smoke-test the orchestration with --include-game (dry-ish)**

We don't run a full mirror yet (Task 10). Just verify imports resolve and the parser accepts realistic flags:

Run: `python mirror.py --lobby https://example.org/ --games 1 --include-game https://example.org/g1/ --no-rewrite --out /tmp/_check 2>&1 | head -20`

Expected: prints `[1/3] Discovering ...` then proceeds; will fail at the actual fetch since example.org has no iframes — that's fine. We're confirming the CLI plumbing, not the network.

If on Windows without `/tmp`, use `--out ./_check`. Delete the `_check` directory after.

- [ ] **Step 4: Commit**

```bash
git add mirror.py
git commit -m "feat(mirror): CLI orchestrator wiring discovery, capture, rewrite"
```

---

## Task 9: serve.py

Static server rooted at `mirror/` for verification.

**Files:**
- Create: `serve.py`

- [ ] **Step 1: Write the implementation**

Create `serve.py`:

```python
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
```

- [ ] **Step 2: Verify the script parses and errors clearly without a mirror dir**

Run: `python serve.py --root nonexistent`
Expected: exits with `Mirror directory not found: ...nonexistent. Run mirror.py first.`

- [ ] **Step 3: Commit**

```bash
git add serve.py
git commit -m "feat(serve): static server for mirror verification"
```

---

## Task 10: End-to-end smoke test against the real demo

This is **manual verification**, not automated. Run the full pipeline against `virtual-games.virtustec.com` and confirm the mirror looks like the original. Document any issues.

- [ ] **Step 1: Run the full mirror**

```bash
python mirror.py --games 6 --out ./mirror
```

Expected output (rough):
```
[1/3] Discovering game iframes from https://virtual-games.virtustec.com/demo/desktop/ ...
  Found 6 games:
    - https://...
    - https://...
    ...
[2/3] Capturing 7 URLs ...
  [1/7] https://virtual-games.virtustec.com/demo/desktop/
  ...
[3/3] Rewriting absolute URLs ...

Done. <N> files saved under mirror/
```

This will take 3-5 minutes. The first run also downloads Camoufox (~150 MB) if Scrapling hasn't already.

If `find_game_iframes` raises `RuntimeError: Found only 0 iframe(s)`, the lobby mounts iframes only on click. Fallback: open the demo manually in a browser, copy the 6 game URLs from the address bar / network tab, and rerun:

```bash
python mirror.py \
  --include-game https://...g1/ \
  --include-game https://...g2/ \
  --include-game https://...g3/ \
  --include-game https://...g4/ \
  --include-game https://...g5/ \
  --include-game https://...g6/
```

- [ ] **Step 2: Inspect the manifest**

```bash
python -c "import json; m=json.load(open('mirror/manifest.json')); print(f'{len(m)} entries'); print('Hosts:', sorted({e[\"url\"].split(\"/\")[2] for e in m}))"
```

Expected: at least a few hundred entries, host list includes `virtual-games.virtustec.com` and possibly CDN subdomains.

- [ ] **Step 3: Start the local server**

```bash
python serve.py
```

Expected: prints the verify URL. Leave running.

- [ ] **Step 4: Browser checklist**

Open `http://localhost:8000/virtual-games.virtustec.com/demo/desktop/` in a browser. Verify:

- [ ] Lobby renders with original fonts and icons (no fallback serif/sans-serif).
- [ ] Layout matches the original at 1920x1080 (compare side-by-side with `https://virtual-games.virtustec.com/demo/desktop/`).
- [ ] Open DevTools → Network. Refresh. **All requests** must be to `localhost:8000`. None to `virtual-games.virtustec.com`. (Failed XHRs to backend APIs are expected and fine — they're out of scope per the spec.)
- [ ] Click into each of the 6 mirrored games. Each iframe loads its mirrored copy from `localhost`.

- [ ] **Step 5: Document any gaps**

If anything is missing visually:

1. Note the URL of the missing asset from the browser's failing request.
2. Search the manifest: `grep "<asset-url>" mirror/manifest.json`. If absent, the listener missed it (likely loaded after the scroll). Re-run with a longer wait — temporarily bump `await page.wait_for_timeout(1500)` to `5000` in `lib/capture.py` and re-mirror.
3. If the asset is in the manifest but not loading from localhost, it's a rewrite miss — add a regression test to `tests/test_rewrite.py` and fix the regex.

- [ ] **Step 6: Commit the manifest as a fingerprint**

The manifest is small and useful for "did the next mirror run capture more or fewer assets?":

```bash
cp mirror/manifest.json docs/superpowers/specs/2026-05-06-mirror-baseline-manifest.json
git add docs/superpowers/specs/2026-05-06-mirror-baseline-manifest.json
git commit -m "docs: baseline manifest from first successful mirror run"
```

---

## Done

After Task 10 passes, the mirror is ready for the user to start customizing (logos, theme variables, catalog). Out-of-scope follow-ups documented in spec section 11:

- Theme customization guide
- Logo/asset swap script
- Backend stub server for runtime XHRs
