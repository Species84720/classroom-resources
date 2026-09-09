\
#!/usr/bin/env python3
import json, sys
from pathlib import Path

def main():
    root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    resources_dir = root / "resources"
    items = []
    if resources_dir.exists():
        for meta in sorted(resources_dir.glob("*/meta.json")):
            try:
                data = json.loads(meta.read_text(encoding="utf-8"))
                slug = meta.parent.name
                data["url"] = f"resources/{slug}/"
                items.append(data)
            except Exception as e:
                raise SystemExit(f"Could not parse {meta}: {e}")
    items.sort(key=lambda x: (str(x.get("year_group","")), str(x.get("title","")).casefold()))
    out = root / "resources.json"
    out.write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {out} with {len(items)} resources")

if __name__ == "__main__":
    main()
