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


def _fake_route(url, status=200, body=b"x", content_type="text/css"):
    """Build a Playwright Route mock that yields the given response when fetched."""
    response = MagicMock()
    response.status = status
    response.headers = {"content-type": content_type}
    response.body = AsyncMock(return_value=body)

    route = MagicMock()
    route.request = MagicMock()
    route.request.url = url
    route.fetch = AsyncMock(return_value=response)
    route.fulfill = AsyncMock()
    route.continue_ = AsyncMock()
    return route, response


@pytest.mark.asyncio
async def test_capture_page_intercepts_routes_and_fulfills(tmp_path):
    """Verify capture_page installs a route handler, routes go through it,
    bodies are fetched + saved + forwarded to the page via fulfill()."""
    manifest = Manifest(tmp_path)

    routes = [
        _fake_route("https://x.com/a.css", content_type="text/css"),
        _fake_route("https://x.com/b.js", body=b"alert(1)", content_type="application/javascript"),
    ]

    fake_page = MagicMock()
    handler = {"cb": None}

    async def route(_pattern, cb):
        handler["cb"] = cb

    async def reload(**kwargs):
        assert handler["cb"] is not None, "route handler must be installed before reload"
        for r, _ in routes:
            await handler["cb"](r)

    fake_page.route = route
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
    # Each route was fulfilled (response forwarded to the page)
    for r, _ in routes:
        r.fulfill.assert_awaited_once()


@pytest.mark.asyncio
async def test_capture_page_skips_data_urls_via_continue(tmp_path):
    """data: and blob: URLs must not be fetched/saved; the route is continued."""
    manifest = Manifest(tmp_path)

    data_route, _ = _fake_route("data:image/png;base64,AAAA")
    blob_route, _ = _fake_route("blob:abc")

    fake_page = MagicMock()
    handler = {"cb": None}

    async def route(_pattern, cb):
        handler["cb"] = cb

    async def reload(**kwargs):
        await handler["cb"](data_route)
        await handler["cb"](blob_route)

    fake_page.route = route
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

    assert manifest.entries == []
    data_route.continue_.assert_awaited_once()
    blob_route.continue_.assert_awaited_once()
    data_route.fetch.assert_not_awaited()
    blob_route.fetch.assert_not_awaited()
