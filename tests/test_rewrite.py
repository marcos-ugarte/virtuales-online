import json
from pathlib import Path
from lib.rewrite import rewrite_text, rewrite_mirror, is_text
from lib.storage import Manifest, save_body


def test_rewrite_in_html():
    out = rewrite_text('<link href="https://x.com/a.css">', "x.com")
    assert out == '<link href="/a.css">'


def test_rewrite_in_css_url():
    out = rewrite_text('background: url(https://x.com/font.woff);', "x.com")
    assert out == 'background: url(/font.woff);'


def test_rewrite_handles_http_and_https():
    out = rewrite_text('http://x.com/a https://x.com/b', "x.com")
    assert out == '/a /b'


def test_rewrite_keeps_other_hosts():
    out = rewrite_text('https://other.com/foo https://x.com/bar', "x.com")
    assert out == 'https://other.com/foo /bar'


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
    assert (tmp_path / "x.com" / "a.css").read_text() == '@import "/b.css";'
    # Binary file untouched
    assert (tmp_path / "x.com" / "img.png").read_bytes() == b"\x89PNG\r\n"


def test_rewrite_mirror_skips_undecodable(tmp_path):
    """Files with text/* content-type but invalid UTF-8 should be left alone, not crash."""
    manifest = Manifest(tmp_path)
    save_body("https://x.com/weird.css", b"\xff\xfe garbage", "text/css", tmp_path, manifest)
    rewrite_mirror(tmp_path, "x.com", manifest)  # must not raise
    assert (tmp_path / "x.com" / "weird.css").read_bytes() == b"\xff\xfe garbage"
