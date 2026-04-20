"""
Check which building/trap level images are missing.

Reads:
  scripts/id.csv          — ID → wiki name mapping
  data/{cat}/{id}.json    — upgrade level list
  public/images/{cat}/{id}/{level}.png — expected image files

Writes scripts/nolevel.txt, one line per missing level:
  {category}/{id} ({name})  level {N}

Usage:
  python scripts/check_images.py
"""

import csv
import json
from pathlib import Path

LEVELED_CATEGORIES = ("buildings", "traps")

SIEGE_IDS = {
    4000051, 4000052, 4000062, 4000075,
    4000087, 4000091, 4000092, 4000135,
}


def get_category(item_id: int) -> str:
    if item_id >= 90000000:
        return "equipment"
    if item_id >= 73000000:
        return "pets"
    if item_id >= 28000000:
        return "heroes"
    if item_id >= 26000000:
        return "spells"
    if item_id >= 12000000:
        return "traps"
    if item_id >= 4000000:
        return "siege_machines" if item_id in SIEGE_IDS else "units"
    return "buildings"


def load_csv(csv_path: Path) -> list:
    items = []
    with open(csv_path, encoding="utf-8", newline="") as f:
        for row in csv.reader(f):
            if len(row) < 2:
                continue
            try:
                item_id = int(row[0].strip())
            except ValueError:
                continue
            name = row[1].strip()
            if item_id == 0 or name.lower() == "null":
                continue
            items.append((item_id, name))
    return items


def main():
    items = load_csv(Path("scripts/id.csv"))

    lines = []
    checked = 0
    skipped_no_json = 0

    for item_id, name in items:
        cat = get_category(item_id)
        if cat not in LEVELED_CATEGORIES:
            continue

        json_path = Path("data") / cat / f"{item_id}.json"
        if not json_path.exists():
            skipped_no_json += 1
            continue

        with open(json_path, encoding="utf-8") as f:
            data = json.load(f)

        levels = [entry["level"] for entry in data.get("upgrade", [])]
        if not levels:
            continue

        img_dir = Path("images") / cat / str(item_id)
        for level in levels:
            checked += 1
            if not (img_dir / f"{level}.png").exists():
                lines.append(f"{cat}/{item_id} ({name})  level {level}")

    out_path = Path("scripts/nolevel.txt")
    out_path.write_text("\n".join(lines) + ("\n" if lines else ""), encoding="utf-8")

    print(f"Checked {checked} level-image slots across {len(lines) + checked - len(lines)} entries")
    print(f"Skipped {skipped_no_json} items with no JSON file")
    print(f"Missing: {len(lines)} level images")
    print(f"Written: {out_path}")


if __name__ == "__main__":
    main()
