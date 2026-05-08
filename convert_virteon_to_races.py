#!/usr/bin/env python3
"""
convert_virteon_to_races.py
Converts the Virteon WebSocket fixture into custom-lobby/data/races.json
that the lobby's index.html + markets.js can consume.
"""

import json
import math
import time
import os

# ─── Paths ────────────────────────────────────────────────────────────────────
FIXTURE_PATH = os.path.join(
    os.path.dirname(__file__),
    "C:/Users/jorge/GIT/virteon-platform/virteon-platform/apps/pos/docs/ws-messages-raw.json"
)
# Use absolute path directly since __file__ may be relative
FIXTURE_PATH = r"C:\Users\jorge\GIT\virteon-platform\virteon-platform\apps\pos\docs\ws-messages-raw.json"
OUTPUT_PATH  = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                            "custom-lobby", "data", "races.json")

# ─── Start-time offsets (seconds from now) ────────────────────────────────────
OFFSETS = {
    "dog_race_1":   180,
    "dog_race_2":   300,
    "horse_race_1": 480,
}

# ─── Synthetic horse jockeys (7 distinct names) ───────────────────────────────
JOCKEYS = ["K. Voss", "M. Alvarez", "J. Brouwer", "T. Nakata",
           "S. Okonkwo", "L. Ferreira", "P. Dubois"]

# ─── Cycling lists ────────────────────────────────────────────────────────────
SEXES_DOG       = ["dog", "bitch"]
RACING_LINES    = ["rail", "middle", "wide", "very wide"]
HORSE_COLORS    = ["bay", "chestnut", "grey", "black"]
HORSE_SEXES     = ["filly", "colt"]


def clamp(val, lo=0.0, hi=1.0):
    return max(lo, min(hi, val))


def pace_from_bestlap(best_lap, all_laps):
    """top-third → fast, middle-third → middle, bottom-third → slow"""
    sorted_laps = sorted(all_laps)
    n = len(sorted_laps)
    rank = sorted_laps.index(best_lap)   # lower lap time = faster
    # rank 0 = fastest
    frac = rank / max(n - 1, 1)
    if frac < 1 / 3:
        return "fast"
    elif frac < 2 / 3:
        return "middle"
    else:
        return "slow"


def parse_id_tail(id_str):
    """'141_101_202512310194' → 202512310194"""
    parts = str(id_str).split("_")
    try:
        return int(parts[-1])
    except (ValueError, IndexError):
        return 0


def build_participants_dog(competitors_dict, odds_list):
    """Build DogParticipant list from virteon competitors dict + odds."""
    keys = sorted(competitors_dict.keys(), key=lambda x: int(x))
    all_laps = [competitors_dict[k].get("bestLap", 35) for k in keys]

    participants = []
    for idx, k in enumerate(keys):
        c = competitors_dict[k]
        pos = idx + 1

        # forecast: last5 split + pad to 5
        last5_raw = c.get("last5", "0|0|0|0|0")
        forecast = last5_raw.split("|")
        while len(forecast) < 5:
            forecast.append("0")
        forecast = forecast[:5]

        # prob from odds
        win_odd = odds_list[idx] if idx < len(odds_list) else 5.0
        prob = clamp(1.0 / (win_odd * 1.08))

        # star: round(strikeRate / 20), clamped 1..5
        strike_rate = c.get("strikeRate", 10)
        star = int(max(1, min(5, round(strike_rate / 20))))

        # ability
        ability = clamp(strike_rate / 100)

        # pace
        best_lap = c.get("bestLap", 35)
        pace = pace_from_bestlap(best_lap, all_laps)

        # aggressiveness: nbr1 / racesForStatistic
        nbr1 = c.get("nbr1", 0)
        races_for_stat = c.get("racesForStatistic", 20) or 20
        aggressiveness = clamp(nbr1 / races_for_stat)

        weight = c.get("weight", 30.0)

        participant = {
            "classType":      "DogParticipant",
            "id":             str(pos),
            "name":           c.get("name", f"Dog {pos}"),
            "prob":           round(prob, 6),
            "forecast":       forecast,
            "form":           round(clamp(c.get("performance", 0.5)), 6),
            "star":           star,
            "ability":        round(ability, 6),
            "pace":           pace,
            # Dog-only
            "age":            30 + (idx * 3 % 16),   # cycles 30..45
            "sex":            SEXES_DOG[idx % 2],
            "art":            round(float(weight) if weight else 20.0, 1),
            "aggressiveness": round(aggressiveness, 6),
            "bestTime":       round(best_lap, 6),
            "currentWeight":  round(float(weight), 6),
            "idealWeight":    round(float(weight) * 0.9, 6),
            "racingLine":     RACING_LINES[idx % len(RACING_LINES)],
        }
        participants.append(participant)
    return participants


def build_participants_horse(competitors_dict, odds_list):
    """Build HorseParticipant list from virteon competitors dict + odds."""
    keys = sorted(competitors_dict.keys(), key=lambda x: int(x))
    all_laps = [competitors_dict[k].get("bestLap", 33) for k in keys]

    # normalise bestLap for stamina: longest lap = 0 stamina, shortest = 1
    min_lap = min(all_laps)
    max_lap = max(all_laps)
    lap_range = max_lap - min_lap or 1

    participants = []
    for idx, k in enumerate(keys):
        c = competitors_dict[k]
        pos = idx + 1

        last5_raw = c.get("last5", "0|0|0|0|0")
        forecast = last5_raw.split("|")
        while len(forecast) < 5:
            forecast.append("0")
        forecast = forecast[:5]

        win_odd = odds_list[idx] if idx < len(odds_list) else 5.0
        prob = clamp(1.0 / (win_odd * 1.08))

        strike_rate = c.get("strikeRate", 10)
        star = int(max(1, min(5, round(strike_rate / 20))))
        ability = clamp(strike_rate / 100)

        best_lap = c.get("bestLap", 33)
        pace = pace_from_bestlap(best_lap, all_laps)

        # stamina: 1 - normalised bestLap (lower bestLap = faster = more stamina)
        stamina = clamp(1.0 - (best_lap - min_lap) / lap_range)

        num_wins   = c.get("numberOfWins", 0)
        num_second = c.get("numberOfSecond", 0)
        num_races  = c.get("numberOfRaces", 1) or 1
        wins_ratio  = clamp(num_wins / num_races)
        place_ratio = clamp(num_second / num_races)

        nbr3 = c.get("nbr3", None)
        time_off = int(nbr3) if nbr3 is not None else (5 + (idx * 2 % 10))

        participant = {
            "classType": "HorseParticipant",
            "id":        str(pos),
            "name":      c.get("name", f"Horse {pos}"),
            "prob":      round(prob, 6),
            "forecast":  forecast,
            "form":      round(clamp(c.get("performance", 0.5)), 6),
            "star":      star,
            "ability":   round(ability, 6),
            "pace":      pace,
            # Horse-only
            "jockey":    JOCKEYS[idx % len(JOCKEYS)],
            "color":     HORSE_COLORS[idx % len(HORSE_COLORS)],
            "sex":       HORSE_SEXES[idx % len(HORSE_SEXES)],
            "speed":     round(clamp(c.get("performance", 0.5)), 6),
            "stamina":   round(stamina, 6),
            "wins":      round(wins_ratio, 6),
            "place":     round(place_ratio, 6),
            "timeOff":   time_off,
            "handicap":  round(clamp(c.get("performance", 0.5)), 6),
        }
        participants.append(participant)
    return participants


def convert_game_round(gr, race_key, starts_at_ms):
    """Convert one Virteon GameRound dict into our JSON shape."""
    event_type = gr.get("eventType")
    is_dog = event_type in ("dog", "dog8")

    id_str      = gr.get("id", "")
    id_betoffer = gr.get("idBetoffer", 0)
    event_id    = parse_id_tail(id_str)
    block_id    = event_id   # use same tail for eBlockId

    competitors = gr.get("competitors", {})
    odds_list   = gr.get("odds", [])

    if is_dog:
        participants = build_participants_dog(competitors, odds_list)
        class_type   = "DogParticipant"
    else:
        participants = build_participants_horse(competitors, odds_list)
        class_type   = "HorseParticipant"

    # oddValues: stringify all odds to 2 decimal places
    odd_values = ["{:.2f}".format(float(o)) for o in odds_list]

    # trackCondition from humidity
    humidity = gr.get("humidity", 0) or 0
    track_condition = round(humidity / 100, 4)

    return {
        "classType":    class_type,
        "eventId":      event_id,
        "serverStatus": "SCHEDULED",
        "startsAtMs":   starts_at_ms,
        "event": {
            "eventId": event_id,
            "order":   0,
            "data": {
                "participants": participants,
                "oddValues":    odd_values,
                "gameData": {
                    "trackCondition": track_condition,
                },
            },
        },
        "block": {
            "eBlockId":         block_id,
            "playlistId":       id_betoffer,
            "contentBlockType": "PLAYLIST",
            "serverStatus":     "SCHEDULED",
            "blockType":        "SIMPLE",
        },
    }


def main():
    with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
        fixture = json.load(f)

    # Collect first GameRound of each required eventType
    first_rounds = {}
    for msg in fixture.get("messages", []):
        d = msg.get("data", {})
        if d.get("msgType") != "gameRound":
            continue
        for gr in d.get("gamepool", []):
            et = gr.get("eventType")
            if et in ("dog", "dog8", "horsec") and et not in first_rounds:
                first_rounds[et] = gr

    required = {"dog": "dog_race_1", "dog8": "dog_race_2", "horsec": "horse_race_1"}
    missing = [k for k in required if k not in first_rounds]
    if missing:
        raise RuntimeError(f"Missing eventTypes in fixture: {missing}")

    now_ms = int(time.time() * 1000)
    races  = {}

    for et, race_key in required.items():
        offset_s    = OFFSETS[race_key]
        starts_at   = now_ms + offset_s * 1000
        races[race_key] = convert_game_round(first_rounds[et], race_key, starts_at)

    # Write output
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(races, f, indent=2, ensure_ascii=False)

    # Summary
    counts = {k: len(races[k]["event"]["data"]["participants"]) for k in races}
    starts = {k: f"+{OFFSETS[k]}s" for k in races}
    print(
        f"Wrote {len(races)} races.\n"
        f"Source: {FIXTURE_PATH}\n"
        f"Starts at: dog_race_1={starts['dog_race_1']}, "
        f"dog_race_2={starts['dog_race_2']}, "
        f"horse_race_1={starts['horse_race_1']}\n"
        f"Participant counts: " +
        ", ".join(f"{k}={counts[k]}" for k in counts)
    )
    print(f"Output: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
