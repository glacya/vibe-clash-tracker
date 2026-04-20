"""
Clash of Clans Fandom wiki batch crawler.

Usage (single):
    python scripts/crawl_wiki.py <url> <json_file>

Usage (batch):
    python scripts/crawl_wiki.py --batch [--test] [--workers N]

    --test       Process only the first 3 items per category.
    --workers N  Number of parallel Chrome instances (default: 3).

Failures are appended to scripts/skip.log with timestamp and reason.
Equipment items (90000xxx) are image-only — no JSON is written.
"""

import sys
import csv
import json
import os
import re
import threading
import time
import urllib.request
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


# ── category / metadata ───────────────────────────────────────────────────────

SIEGE_IDS = {
    4000051, 4000052, 4000062, 4000075,
    4000087, 4000091, 4000092, 4000135,
}

# For buildings whose images are behind a mode tab, map item_id → tab label to click
BUILDING_IMAGE_TAB = {
    1000021: "Ground Mode",         # X-Bow
    1000027: "Single-Target Mode",  # Inferno Tower
    1000072: "Rage Spell Tower",    # Spell Tower
    1000079: "Fast Attack",         # Multi-Gear Tower
}

# Which level-requirement key to inject into new upgrade entries by category
DEFAULT_REQ_KEY: dict = {
    "buildings":      "town_hall",
    "traps":          "town_hall",
    "units":          "laboratory",
    "siege_machines": "laboratory",
    "heroes":         "hero_hall",
    "spells":         "laboratory",
    "pets":           "pet_house",
    "equipment":      None,
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


# ── skip log ──────────────────────────────────────────────────────────────────

_log_lock = threading.Lock()
SKIP_LOG = Path("scripts/skip.log")


def log_skip(item_id: int, name: str, reason: str) -> None:
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] {item_id} {name}: {reason}\n"
    with _log_lock:
        with open(SKIP_LOG, "a", encoding="utf-8") as f:
            f.write(line)


# ── progress tracking ─────────────────────────────────────────────────────────

_progress_lock = threading.Lock()
_completed = 0
_total = 0


def report(item_id: int, name: str, category: str, status: str) -> None:
    global _completed
    with _progress_lock:
        _completed += 1
        print(f"[{_completed}/{_total}] {category}/{item_id} {name} — {status}")


# ── helpers ───────────────────────────────────────────────────────────────────

def parse_cost(text: str):
    clean = text.replace(",", "").strip()
    if not clean or clean in ("-", "N/A", "—"):
        return None
    try:
        return int(clean)
    except ValueError:
        return None


def normalise_time(text: str):
    text = text.strip()
    if not text or text.lower() in ("instant", "-", "—", "n/a"):
        return None
    patterns = [
        (r"(\d+)\s*d(?:ay)?s?", "d"),
        (r"(\d+)\s*h(?:our)?s?", "h"),
        (r"(\d+)\s*m(?:in(?:ute)?)?s?", "m"),
        (r"(\d+)\s*s(?:ec(?:ond)?)?s?", "s"),
    ]
    parts = []
    for pattern, abbr in patterns:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            parts.append(f"{m.group(1)}{abbr}")
    return " ".join(parts) if parts else None


def clean_text(el) -> str:
    return el.get_attribute("innerText").strip()


# ── resource type detection ───────────────────────────────────────────────────

_RESOURCE_ALT_MAP = [
    ("dark_elixir", ["dark elixir", "dark_elixir"]),
    ("elixir",      ["elixir"]),
    ("gold",        ["gold"]),
    ("gem",         ["gem"]),
]


def _detect_resource_from_img(img) -> str:
    combined = (
        (img.get_attribute("alt") or "")
        + " "
        + (img.get_attribute("data-image-name") or "")
    ).lower()
    for resource, keywords in _RESOURCE_ALT_MAP:
        if any(kw in combined for kw in keywords):
            return resource
    return None


def detect_resource_type_from_header(th) -> str:
    for img in th.find_elements(By.CSS_SELECTOR, "img"):
        r = _detect_resource_from_img(img)
        if r:
            return r
    return None


def _is_cost_header(header_text: str) -> bool:
    h = header_text.lower()
    return "cost" in h and "cumulative" not in h and "boost" not in h


# ── Home Village tab ──────────────────────────────────────────────────────────

def click_home_village_tab(driver) -> None:
    try:
        candidates = driver.find_elements(
            By.XPATH,
            "//*[contains(@class,'wds-tabs') or contains(@class,'tab-content')]"
            "//*[contains(translate(normalize-space(text()),"
            "'HOMEVLAG','homevlag'),'home village')]",
        )
        if not candidates:
            candidates = driver.find_elements(
                By.XPATH,
                "//*[contains(translate(normalize-space(.),"
                "'HOMEVLAG','homevlag'),'home village') and "
                "(self::a or self::button or self::li)]",
            )
        if candidates:
            candidates[0].click()
            time.sleep(1.5)
    except Exception:
        pass


# ── upgrade table extraction ──────────────────────────────────────────────────

def extract_upgrade_rows(driver):
    tables = driver.find_elements(By.CSS_SELECTOR, "table")
    target_table = None
    headers = []
    header_elements = []

    for table in tables:
        ths = table.find_elements(By.CSS_SELECTOR, "th")
        if not ths:
            continue
        raw = [clean_text(th) for th in ths]
        first = raw[0].strip().lower() if raw else ""
        if first in ("level", "th level"):
            target_table = table
            headers = raw
            header_elements = ths
            break

    if target_table is None:
        raise RuntimeError("Upgrade table not found (no <th>='Level')")

    cost_idx = next(
        (i for i, h in enumerate(headers) if _is_cost_header(h)), None
    )
    time_idx = next(
        (i for i, h in enumerate(headers) if "time" in h.lower()), None
    )
    req_idx = next(
        (i for i, h in enumerate(headers)
         if "required" in h.lower() and i != 0), None
    )

    resource_type_hint = None
    if cost_idx is not None and cost_idx < len(header_elements):
        resource_type_hint = detect_resource_type_from_header(header_elements[cost_idx])

    rows_data = []
    last_req = None

    for tr in target_table.find_elements(By.CSS_SELECTOR, "tr"):
        cells = tr.find_elements(By.CSS_SELECTOR, "td")
        if not cells:
            continue
        level_text = clean_text(cells[0])
        if not re.match(r"^\d+$", level_text):
            continue
        level = int(level_text)

        cost = None
        if cost_idx is not None and cost_idx < len(cells):
            cost = parse_cost(clean_text(cells[cost_idx]))

        t = None
        if time_idx is not None and time_idx < len(cells):
            t = normalise_time(clean_text(cells[time_idx]))

        level_required = None
        if req_idx is not None and req_idx < len(cells):
            rt = clean_text(cells[req_idx]).strip()
            if re.match(r"^\d+$", rt):
                level_required = int(rt)

        if level_required is None:
            level_required = last_req
        else:
            last_req = level_required

        rows_data.append({
            "level": level,
            "cost": cost,
            "time": t,
            "level_required": level_required,
        })

    return rows_data, resource_type_hint


# ── available table extraction ────────────────────────────────────────────────

def extract_available(driver):
    def get_ints(tr):
        cells = tr.find_elements(By.CSS_SELECTOR, "td, th")
        out = []
        for c in cells[1:]:
            try:
                out.append(int(clean_text(c).strip()))
            except ValueError:
                pass
        return out

    for table in driver.find_elements(By.CSS_SELECTOR, "table"):
        rows = table.find_elements(By.CSS_SELECTOR, "tr")
        if len(rows) != 4:
            continue
        r2_cells = rows[1].find_elements(By.CSS_SELECTOR, "td, th")
        if not r2_cells:
            continue
        if "number available" not in clean_text(r2_cells[0]).lower():
            continue

        th_low     = get_ints(rows[0])
        cnt_low    = get_ints(rows[1])
        th_high    = get_ints(rows[2])
        cnt_high   = get_ints(rows[3])

        th_count = {}
        for th, c in zip(th_low, cnt_low):
            th_count[th] = c
        for th, c in zip(th_high, cnt_high):
            th_count[th] = c
        if not th_count:
            continue

        max_th = max(th_count.keys())
        values = [th_count.get(th, 0) for th in range(1, max_th + 1)]
        available = []
        prev = 0
        for i, v in enumerate(values):
            if v != prev:
                available.extend([i + 1] * (v - prev))
                prev = v
        if available:
            return available

    return None


# ── image downloading ─────────────────────────────────────────────────────────

def _real_img_url(img) -> str:
    url = img.get_attribute("data-src") or img.get_attribute("src") or ""
    url = re.sub(r"/revision/latest/.*", "/revision/latest", url)
    return url


def _download(url: str, dest: Path) -> str:
    """Download url to dest. Returns '' on success, error string on failure."""
    if not url or url.startswith("data:"):
        return "no real URL"
    dest.parent.mkdir(parents=True, exist_ok=True)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=180) as resp:
            status = resp.status
            if status != 200:
                return f"HTTP {status}"
            dest.write_bytes(resp.read())
        return ""
    except urllib.error.HTTPError as e:
        return f"HTTP {e.code}"
    except Exception as e:
        return str(e)


def download_building_images(driver, item_id: int, name: str, category: str = "buildings") -> list:
    """Returns list of (dest, error) pairs. Saves to images/{category}/{id}/{level}.png"""
    alt_base = name.replace("_", " ")
    level_imgs = {}
    for img in driver.find_elements(By.CSS_SELECTOR, "img"):
        alt = img.get_attribute("alt") or ""
        m = re.match(rf"^{re.escape(alt_base)}\s*(\d+)$", alt, re.IGNORECASE)
        if m:
            lvl = int(m.group(1))
            if lvl not in level_imgs:
                level_imgs[lvl] = img

    results = []
    for lvl, img in sorted(level_imgs.items()):
        url = _real_img_url(img)
        dest = Path("images") / category / str(item_id) / f"{lvl}.png"
        err = _download(url, dest)
        results.append((dest, err))
    return results


def download_single_image(driver, category: str, item_id: int) -> tuple:
    """Returns (dest, error)."""
    dest = Path("images") / category / f"{item_id}.png"

    # 1. Gallery item with 'avatar' or 'icon' caption
    for item in driver.find_elements(
        By.CSS_SELECTOR,
        ".wikia-gallery-item, .gallery-item, figure.pi-item",
    ):
        cap_els = item.find_elements(By.CSS_SELECTOR, ".lightbox-caption, figcaption")
        cap = cap_els[0].get_attribute("innerText").lower() if cap_els else ""
        if "avatar" in cap or "icon" in cap:
            imgs = item.find_elements(By.CSS_SELECTOR, "img")
            if imgs:
                err = _download(_real_img_url(imgs[0]), dest)
                return dest, err

    # 2. Portable infobox image
    for sel in [".pi-image-thumbnail", ".pi-image img", ".portable-infobox img"]:
        imgs = driver.find_elements(By.CSS_SELECTOR, sel)
        if imgs:
            err = _download(_real_img_url(imgs[0]), dest)
            return dest, err

    # 3. First reasonably-sized article image
    for img in driver.find_elements(By.CSS_SELECTOR, ".mw-parser-output img"):
        src = img.get_attribute("data-src") or img.get_attribute("src") or ""
        if "data:" in src:
            continue
        try:
            if int(img.get_attribute("width") or 0) < 50:
                continue
        except ValueError:
            pass
        err = _download(_real_img_url(img), dest)
        return dest, err

    return dest, "no suitable image found"


def _click_named_tab(driver, tab_text: str) -> None:
    """Click a tab whose visible text matches tab_text (exact, case-insensitive)."""
    try:
        lower = tab_text.lower()
        candidates = driver.find_elements(
            By.XPATH,
            f"//*[normalize-space(translate(.,'{tab_text.upper()}','{tab_text.lower()}'))='{lower}'"
            f" and (self::a or self::button or self::li or contains(@class,'tab'))]",
        )
        if not candidates:
            # Broader: any element whose text contains the label
            candidates = driver.find_elements(
                By.XPATH,
                f"//*[contains(translate(normalize-space(text()),'{tab_text.upper()}','{tab_text.lower()}'),'{lower}')]",
            )
        if candidates:
            candidates[0].click()
            time.sleep(1.0)
    except Exception:
        pass


def download_images(driver, category: str, item_id: int, name: str) -> list:
    """Download images and return list of (dest, error) pairs."""
    if category in ("buildings", "traps"):
        tab = BUILDING_IMAGE_TAB.get(item_id)
        if tab:
            _click_named_tab(driver, tab)
        return download_building_images(driver, item_id, name, category)
    else:
        return [download_single_image(driver, category, item_id)]


# ── Selenium driver factory ───────────────────────────────────────────────────

def make_driver() -> webdriver.Chrome:
    opts = Options()
    opts.add_argument("--headless=new")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--window-size=1280,900")
    opts.add_argument("--log-level=3")
    opts.add_argument("--disable-logging")
    opts.add_argument("--silent")
    opts.add_experimental_option("excludeSwitches", ["enable-logging"])
    opts.add_argument(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
    svc = Service(log_path=os.devnull)
    return webdriver.Chrome(service=svc, options=opts)


# ── JSON helpers ──────────────────────────────────────────────────────────────

LEVEL_REQ_KEYS = ["pet_house", "laboratory", "town_hall", "hero_hall"]


def ensure_json(json_path: Path) -> None:
    """Create a minimal JSON skeleton if the file (or its directory) is missing."""
    json_path.parent.mkdir(parents=True, exist_ok=True)
    if not json_path.exists():
        json_path.write_text('{"upgrade": []}', encoding="utf-8")


def detect_req_key(upgrade_entries, category: str) -> str:
    for entry in upgrade_entries:
        for k in LEVEL_REQ_KEYS:
            if k in entry:
                return k
    return DEFAULT_REQ_KEY.get(category)


def write_into_json(
    json_path: Path, rows, resource_type_hint, available, category: str
) -> None:
    with open(json_path, encoding="utf-8") as f:
        data = json.load(f)

    existing_upgrade = data.get("upgrade", [])
    req_key = detect_req_key(existing_upgrade, category)

    existing_rt = existing_upgrade[0].get("resource_type") if existing_upgrade else None
    is_list_format = isinstance(existing_rt, list)

    if resource_type_hint:
        resource_type = [resource_type_hint] if is_list_format else resource_type_hint
    else:
        resource_type = existing_rt

    new_upgrade = []
    for row in rows:
        entry = {"level": row["level"]}
        if resource_type is not None:
            entry["resource_type"] = resource_type
        entry["cost"] = row["cost"]
        entry["time"] = row["time"]
        if req_key is not None:
            entry[req_key] = row["level_required"]
        new_upgrade.append(entry)

    data["upgrade"] = new_upgrade
    if available is not None:
        data["available"] = available

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)


def mirror_to_public(json_path: Path) -> None:
    parts = json_path.parts
    try:
        data_idx = next(i for i, p in enumerate(parts) if p == "data")
    except StopIteration:
        return
    public_path = Path("public") / Path(*parts[data_idx:])
    public_path.parent.mkdir(parents=True, exist_ok=True)
    import shutil
    shutil.copy2(json_path, public_path)


# ── per-item processing ───────────────────────────────────────────────────────

def process_item(item_id: int, name: str, category: str) -> None:
    url = f"https://clashofclans.fandom.com/wiki/{name}"
    is_equipment = category == "equipment"
    skip_reasons = []

    driver = make_driver()
    try:
        driver.get(url)
        WebDriverWait(driver, 20).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "table"))
        )
        time.sleep(2)
        click_home_village_tab(driver)

        # Upgrade table (skip for equipment — their costs are in shared files)
        rows = []
        resource_type_hint = None
        available = None
        if not is_equipment:
            try:
                rows, resource_type_hint = extract_upgrade_rows(driver)
                available = extract_available(driver)
            except Exception as e:
                skip_reasons.append(f"table extraction: {e}")

        # Images
        img_results = download_images(driver, category, item_id, name)
        for dest, err in img_results:
            if err:
                reason = f"image download failed ({dest.name}): {err}"
                skip_reasons.append(reason)
                log_skip(item_id, name, reason)

    except Exception as e:
        skip_reasons.append(f"page load: {e}")
        log_skip(item_id, name, f"page load: {e}")
        report(item_id, name, category, f"SKIP ({e})")
        driver.quit()
        return
    finally:
        driver.quit()

    # JSON write (not for equipment)
    if not is_equipment and rows:
        json_path = Path("data") / category / f"{item_id}.json"
        try:
            ensure_json(json_path)
            write_into_json(json_path, rows, resource_type_hint, available, category)
            mirror_to_public(json_path)
        except Exception as e:
            reason = f"JSON write failed: {e}"
            skip_reasons.append(reason)
            log_skip(item_id, name, reason)

    if skip_reasons:
        report(item_id, name, category, "PARTIAL — " + "; ".join(skip_reasons))
    else:
        report(item_id, name, category, "OK")


# ── CSV reading ───────────────────────────────────────────────────────────────

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


# ── batch mode ────────────────────────────────────────────────────────────────

def run_batch(test_mode: bool, workers: int) -> None:
    global _total, _completed
    _completed = 0

    items = load_csv(Path("scripts/id.csv"))

    by_category = defaultdict(list)
    for item_id, name in items:
        by_category[get_category(item_id)].append((item_id, name))

    limit = 3 if test_mode else None
    work_items = []
    for cat, cat_items in by_category.items():
        subset = cat_items[:limit] if limit else cat_items
        for item_id, name in subset:
            work_items.append((item_id, name, cat))

    _total = len(work_items)
    mode_label = f"TEST (first {limit} per category)" if test_mode else "FULL"
    print(f"Batch {mode_label} — {_total} items, {workers} workers")
    print(f"Failures logged to: {SKIP_LOG}")

    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {
            pool.submit(process_item, iid, nm, cat): (iid, nm, cat)
            for iid, nm, cat in work_items
        }
        for fut in as_completed(futures):
            exc = fut.exception()
            if exc:
                iid, nm, cat = futures[fut]
                log_skip(iid, nm, f"unhandled exception: {exc}")
                report(iid, nm, cat, f"ERROR ({exc})")

    print("Batch complete.")


# ── single-URL mode ───────────────────────────────────────────────────────────

def run_single(url: str, json_path: Path) -> None:
    item_id_str = json_path.stem
    try:
        item_id = int(item_id_str)
    except ValueError:
        item_id = 0
    category = get_category(item_id) if item_id else "buildings"
    name = url.rstrip("/").split("/")[-1]

    if not url.startswith("http"):
        url = "https://clashofclans.fandom.com/wiki/" + url

    driver = make_driver()
    try:
        print(f"Crawling: {url}")
        driver.get(url)
        WebDriverWait(driver, 20).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "table"))
        )
        time.sleep(2)
        click_home_village_tab(driver)

        rows, resource_type_hint = extract_upgrade_rows(driver)
        available = extract_available(driver)
        img_results = download_images(driver, category, item_id, name)
    finally:
        driver.quit()

    if not rows:
        print("ERROR: No rows extracted.")
        sys.exit(1)

    print(f"Extracted {len(rows)} rows.")
    for r in rows:
        print(f"  {r}")
    if available:
        print(f"Available: {available}")

    for dest, err in img_results:
        if err:
            print(f"  Image warning ({dest}): {err}")

    if category != "equipment":
        ensure_json(json_path)
        write_into_json(json_path, rows, resource_type_hint, available, category)
        mirror_to_public(json_path)
        print(f"Written: {json_path}")
    else:
        print("Equipment item — JSON not written.")

    print("Done.")


# ── entry point ───────────────────────────────────────────────────────────────

def main():
    args = sys.argv[1:]

    if args and args[0] == "--batch":
        test_mode = "--test" in args
        workers = 3
        if "--workers" in args:
            idx = args.index("--workers")
            try:
                workers = int(args[idx + 1])
            except (IndexError, ValueError):
                print("ERROR: --workers requires an integer argument.")
                sys.exit(1)
        run_batch(test_mode, workers)
        return

    if len(args) != 2:
        print("Usage:")
        print("  python scripts/crawl_wiki.py <url> <json_file>")
        print("  python scripts/crawl_wiki.py --batch [--test] [--workers N]")
        sys.exit(1)

    run_single(args[0], Path(args[1]))


if __name__ == "__main__":
    main()