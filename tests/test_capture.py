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
