#!/usr/bin/env bash
# Builds dist/recruit-rocket.zip, the one file a user uploads in Customize > Skills.
# The zip holds one top-level folder, recruit-rocket/, with SKILL.md, the role files,
# the standing rules, the templates, and both generators (no node_modules, tests, or output).
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=plugin/skills/recruit-rocket
rm -rf build dist/recruit-rocket.zip
mkdir -p build dist
cp -r "$SRC" build/recruit-rocket
find build/recruit-rocket \( -name node_modules -o -name out -o -name test -o -name '*-pages' \) -prune -exec rm -rf {} +
find build/recruit-rocket -name .gitignore -delete
for f in SKILL.md STANDING_RULES.md generators/resume/build-resume.js generators/baseball-card/render-card.js templates/facts.md; do
  [ -f "build/recruit-rocket/$f" ] || { echo "missing $f"; exit 1; }
done
# The skill zip has no tests, so drop the test script from its package.json
node -e 'const f=process.argv[1],p=require(f);delete p.scripts.test;require("fs").writeFileSync(f,JSON.stringify(p,null,2)+"\n")' "$PWD/build/recruit-rocket/generators/resume/package.json"
# Fixed timestamps so an unchanged skill builds a byte-identical zip
find build/recruit-rocket -exec touch -t 202601010000 {} +
(cd build && find recruit-rocket | sort | zip -qX -@ ../dist/recruit-rocket.zip)
rm -rf build
echo "dist/recruit-rocket.zip"
