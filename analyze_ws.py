"""analyze_ws.py — Summarize captured WebSocket traffic from a mirror run.

Usage:
    python analyze_ws.py [--mirror PATH] [--host HOST]

Default --mirror is ./mirror. --host filters which subdirectory's _websocket/
folder to read; omit to read every _websocket/ dir found under the mirror root.
"""
import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_DISCRIMINATORS = ("type", "op", "event", "cmd", "kind", "action")


def _message_type(payload: str) -> str:
    """Extract a discriminating 'type' string from a JSON text payload.

    Tries the common discriminator field names in order; falls back to the
    sorted top-level keys joined by '|' so that structurally identical
    messages are grouped even without a dedicated type field.
    Returns '<non-json>' for payloads that are not valid JSON objects.
    """
    try:
        obj = json.loads(payload)
    except (json.JSONDecodeError, ValueError):
        return "<non-json>"
    if not isinstance(obj, dict):
        return "<non-object-json>"
    for key in _DISCRIMINATORS:
        if key in obj:
            return f"{key}={obj[key]!r}"
    keys = "|".join(sorted(obj.keys()))
    return f"keys:{keys}" if keys else "<empty-object>"


# ---------------------------------------------------------------------------
# Core reading
# ---------------------------------------------------------------------------

def _read_jsonl(path: Path) -> list[dict]:
    records = []
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                records.append(json.loads(line))
            except json.JSONDecodeError:
                pass  # silently skip malformed lines
    return records


def load_connections(mirror_root: Path, host_filter: str | None) -> list[dict]:
    """Return a list of connection dicts: {file, url, frames: [record, ...]}.

    Searches mirror_root for all _websocket/ subdirectories and collects every
    ws-*.jsonl file found within them.
    """
    ws_dirs: list[Path] = []

    if host_filter:
        candidate = mirror_root / host_filter / "_websocket"
        if candidate.is_dir():
            ws_dirs.append(candidate)
        else:
            # Try case-insensitive search
            for d in mirror_root.iterdir():
                if d.is_dir() and d.name.lower() == host_filter.lower():
                    ws_dir = d / "_websocket"
                    if ws_dir.is_dir():
                        ws_dirs.append(ws_dir)
                        break
    else:
        for d in mirror_root.rglob("_websocket"):
            if d.is_dir():
                ws_dirs.append(d)

    connections = []
    for ws_dir in sorted(ws_dirs):
        for jsonl_file in sorted(ws_dir.glob("ws-*.jsonl")):
            frames = _read_jsonl(jsonl_file)
            url = frames[0]["url"] if frames else "unknown"
            connections.append({
                "file": jsonl_file,
                "url": url,
                "frames": frames,
            })
    return connections


# ---------------------------------------------------------------------------
# Analysis
# ---------------------------------------------------------------------------

def analyze(connections: list[dict]) -> None:
    total_sent = sum(
        sum(1 for f in c["frames"] if f.get("direction") == "sent")
        for c in connections
    )
    total_received = sum(
        sum(1 for f in c["frames"] if f.get("direction") == "received")
        for c in connections
    )
    total_frames = total_sent + total_received

    print("=" * 72)
    print("WebSocket Traffic Summary")
    print("=" * 72)
    print(f"Connections  : {len(connections)}")
    print(f"Total frames : {total_frames}  (sent={total_sent}, received={total_received})")
    print()

    # Per-connection table
    print("--- Connections ---")
    for i, conn in enumerate(connections):
        n = len(conn["frames"])
        sent = sum(1 for f in conn["frames"] if f.get("direction") == "sent")
        recv = n - sent
        print(f"  [{i}] {conn['url']}")
        print(f"       frames={n}  sent={sent}  received={recv}")
        print(f"       file: {conn['file']}")
    print()

    # Aggregate all text frames for type analysis
    type_counts: dict[str, int] = defaultdict(int)
    type_examples: dict[str, str] = {}

    all_frames_sorted: list[dict] = []
    for conn in connections:
        for f in conn["frames"]:
            all_frames_sorted.append(f)

    # Sort globally by timestamp for timeline
    all_frames_sorted.sort(key=lambda f: f.get("timestamp", 0))

    for frame in all_frames_sorted:
        if frame.get("binary"):
            mtype = "<binary>"
        else:
            mtype = _message_type(frame.get("payload", ""))
        type_counts[mtype] += 1
        if mtype not in type_examples:
            raw = frame.get("payload", "")
            type_examples[mtype] = raw[:500]

    print("--- Message Types (top 30 by count) ---")
    sorted_types = sorted(type_counts.items(), key=lambda kv: -kv[1])
    for mtype, count in sorted_types[:30]:
        example = type_examples.get(mtype, "")
        if len(example) > 500:
            example = example[:500] + "…"
        print(f"  {count:>6}x  {mtype}")
        print(f"          example: {example}")
    print()

    # Timeline: first 20 events
    print("--- Timeline (first 20 events) ---")
    for frame in all_frames_sorted[:20]:
        ts = frame.get("timestamp", 0)
        direction = frame.get("direction", "?")
        if frame.get("binary"):
            mtype = "<binary>"
        else:
            mtype = _message_type(frame.get("payload", ""))
        print(f"  {ts:.3f}  {direction:>8}  {mtype}")
    print()


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Analyze captured WebSocket traffic from a mirror run.",
    )
    p.add_argument(
        "--mirror",
        type=Path,
        default=Path("./mirror"),
        metavar="PATH",
        help="Mirror root directory (default: ./mirror)",
    )
    p.add_argument(
        "--host",
        default=None,
        metavar="HOST",
        help="Filter to a specific host subdirectory (e.g. example.com or example.com:8443)",
    )
    return p.parse_args()


def main() -> None:
    args = parse_args()

    if not args.mirror.is_dir():
        print(f"Error: mirror directory not found: {args.mirror}", file=sys.stderr)
        sys.exit(1)

    connections = load_connections(args.mirror, args.host)

    if not connections:
        print("No WebSocket traffic captured.")
        sys.exit(0)

    analyze(connections)


if __name__ == "__main__":
    main()
