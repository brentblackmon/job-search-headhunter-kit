#!/usr/bin/env bash
# Copies the current kit into the public recruit-rocket checkout, minus private files,
# with links pointed at the public repo. Usage: scripts/sync-public.sh /path/to/recruit-rocket
set -euo pipefail
cd "$(dirname "$0")/.."
DEST="$1"
TMP="$(mktemp -d)"
git archive HEAD | tar -x -C "$TMP"
rm -f "$TMP/docs/BUILD_BRIEF.md" "$TMP/marketing/linkedin-preview.png" "$TMP/scripts/sync-public.sh"
python3 - "$TMP" <<'PY'
import sys, pathlib, json
root = pathlib.Path(sys.argv[1])
for p in root.rglob("*"):
    if p.suffix not in (".md", ".json", ".html") or not p.is_file():
        continue
    s = p.read_text()
    o = s
    s = s.replace("brentblackmon/job-search-headhunter-kit", "brentblackmon/recruit-rocket")
    s = s.replace("recruit-rocket@job-search-headhunter-kit", "recruit-rocket@recruit-rocket")
    s = s.replace("docs/BUILD_BRIEF.md       the original build brief\n", "")
    if s != o:
        p.write_text(s)
m = root / ".claude-plugin" / "marketplace.json"
d = json.loads(m.read_text()); d["name"] = "recruit-rocket"; m.write_text(json.dumps(d, indent=2) + "\n")
PY
find "$DEST" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -r "$TMP"/. "$DEST"/
rm -rf "$TMP"
grep -rIl "job-search-headhunter-kit\|BUILD_BRIEF\|real executive job search" "$DEST" --exclude-dir=.git && { echo "private reference found"; exit 1; } || echo "clean"
