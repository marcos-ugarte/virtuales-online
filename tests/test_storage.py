from pathlib import Path
from lib.storage import url_to_path


def test_url_to_path_simple_file():
    assert url_to_path("https://example.com/foo.css", Path("/m")) == Path("/m/example.com/foo.css")


def test_url_to_path_directory_gets_index_html():
    assert url_to_path("https://example.com/demo/desktop/", Path("/m")) == Path("/m/example.com/demo/desktop/index.html")


def test_url_to_path_root_gets_index_html():
    assert url_to_path("https://example.com/", Path("/m")) == Path("/m/example.com/index.html")


def test_url_to_path_drops_query_string():
    assert url_to_path("https://example.com/a.js?v=1", Path("/m")) == Path("/m/example.com/a.js")


def test_url_to_path_drops_multi_query():
    assert url_to_path("https://example.com/a?x=1&y=2", Path("/m")) == Path("/m/example.com/a")


def test_url_to_path_preserves_subdomains():
    assert url_to_path("https://cdn.example.com/a.png", Path("/m")) == Path("/m/cdn.example.com/a.png")


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
