"""Stamp a release before committing: python tools/stamp_build.py --version 0.2.0"""
import argparse
import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def stamp(version):
    if not re.fullmatch(r"\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?", version):
        raise ValueError("Use a version such as 0.2.0")
    now = datetime.now(timezone(timedelta(hours=7)))
    build_id = now.strftime("%Y%m%d-%H%M%S")
    info = {"version": version, "build_id": build_id, "updated_at": now.isoformat(timespec="seconds")}
    html_path = ROOT / "index.html"
    html = html_path.read_text(encoding="utf-8")
    caption = f"v{version} · build {build_id} · อัปเดต {now:%d/%m}/{now.year + 543} {now:%H:%M} น. (ไทย)"
    replacement = f'<small id="build-info" data-build-id="{build_id}">{caption}</small>'
    html, count = re.subn(r'<small id="build-info"[^>]*>[\s\S]*?</small>', replacement, html)
    if count != 1:
        raise ValueError("Expected exactly one build-info marker in index.html")
    html = re.sub(r'((?:src|href)="\./(?:js/[^"]+\.js|css/style\.css))(?:\?[^"]*)?"',
                  lambda m: m[1] + "?v=" + build_id + '"', html)
    html_path.write_text(html, encoding="utf-8")
    (ROOT / "data/build.json").write_text(json.dumps(info, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Stamped v{} build {} at {}".format(version, build_id, info["updated_at"]))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--version", required=True)
    args = parser.parse_args()
    stamp(args.version)
