\
#!/usr/bin/env python3
import json, re, sys
from pathlib import Path
from datetime import datetime

REQUIRED = [
    "id","title","description","year_group","learning_intent","subjects","topics",
    "themes","labels","resource_type","language","estimated_minutes","created","updated"
]
ARRAY_FIELDS = ["subjects","topics","themes","labels"]
slug_re = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")

def fail(msg):
    print(f"ERROR: {msg}", file=sys.stderr)
    return 1

def main():
    if len(sys.argv) != 2:
        return fail("Usage: validate_resource.py path/to/meta.json")
    p = Path(sys.argv[1])
    if not p.exists():
        return fail(f"Not found: {p}")
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
    except Exception as e:
        return fail(f"Invalid JSON: {e}")

    missing = [k for k in REQUIRED if k not in data]
    if missing:
        return fail("Missing fields: " + ", ".join(missing))

    if not isinstance(data["id"], str) or not slug_re.match(data["id"]):
        return fail("id must be lowercase kebab-case")
    if p.parent.name != data["id"]:
        return fail(f"id must match folder name ({p.parent.name})")
    for k in ["title","description","year_group","learning_intent","resource_type","language"]:
        if not isinstance(data[k], str) or not data[k].strip():
            return fail(f"{k} must be a non-empty string")
    for k in ARRAY_FIELDS:
        if not isinstance(data[k], list):
            return fail(f"{k} must be an array")
        if any(not isinstance(x, str) or not x.strip() for x in data[k]):
            return fail(f"{k} must contain only non-empty strings")
        lowered = [x.strip().casefold() for x in data[k]]
        if len(lowered) != len(set(lowered)):
            return fail(f"{k} contains duplicates")
    if not data["subjects"]:
        return fail("subjects must contain at least one subject")
    if not data["topics"]:
        return fail("topics must contain at least one topic")
    if not isinstance(data["estimated_minutes"], int) or data["estimated_minutes"] <= 0:
        return fail("estimated_minutes must be a positive integer")
    for k in ["created","updated"]:
        try:
            datetime.strptime(data[k], "%Y-%m-%d")
        except Exception:
            return fail(f"{k} must be YYYY-MM-DD")
    index = p.parent / "index.html"
    if not index.exists():
        return fail(f"Missing {index}")
    html = index.read_text(encoding="utf-8", errors="ignore").lower()
    forbidden = [
        "google-analytics", "googletagmanager", "facebook.net",
        "connect.facebook", "hotjar", "segment.com", "mixpanel"
    ]
    found = [x for x in forbidden if x in html]
    if found:
        return fail("Potential tracker references found: " + ", ".join(found))
    print(f"OK: {data['id']}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
