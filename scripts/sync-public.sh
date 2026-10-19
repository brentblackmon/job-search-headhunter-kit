#!/usr/bin/env bash
# Copies version.json (and nothing else) into the public recruit-rocket-updates checkout.
# Installed copies fetch it to check for a newer version. The skill source is never published.
# Usage: scripts/sync-public.sh /path/to/recruit-rocket-updates
set -euo pipefail
cd "$(dirname "$0")/.."
DEST="$1"
python3 -c "import json,sys; d=json.load(open('version.json')); assert d.get('version'), 'version.json has no version'"
find "$DEST" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp version.json "$DEST/version.json"
cat > "$DEST/README.md" <<'MD'
# Recruit Rocket updates

This repo holds only `version.json`. Installed copies of Recruit Rocket read it to tell you when a newer version is out. Download new versions from your purchase email.
MD
extra=$(cd "$DEST" && find . -path ./.git -prune -o -type f -print | grep -v -x -e ./version.json -e ./README.md || true)
[ -z "$extra" ] || { echo "unexpected files: $extra"; exit 1; }
echo "clean"
