import asyncio
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

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
