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
