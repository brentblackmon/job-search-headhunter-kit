#!/usr/bin/env bash
# Zips each skill folder into dist/skills/<name>.zip for uploading in the Claude app.
# Each zip holds one top-level folder named after the skill, with SKILL.md inside.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf dist/skills
mkdir -p dist/skills
for dir in plugin/skills/*/; do
  name="$(basename "$dir")"
  (cd plugin/skills && zip -qr "../../dist/skills/${name}.zip" "$name")
  echo "dist/skills/${name}.zip"
done
