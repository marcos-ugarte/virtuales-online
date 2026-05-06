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
