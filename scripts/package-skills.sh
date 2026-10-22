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
# The license travels inside the zip; the skill's copy must match the repo's.
cmp -s LICENSE "$SRC/LICENSE" || { echo "LICENSE and $SRC/LICENSE differ"; exit 1; }
for f in LICENSE VERSION QUICKSTART.pdf RELEASE_NOTES.md SKILL.md STANDING_RULES.md generators/resume/build-resume.js generators/baseball-card/render-card.js templates/facts.md; do
  [ -f "build/recruit-rocket/$f" ] || { echo "missing $f"; exit 1; }
done
# The skill zip has no tests, so drop the test scripts from the package.json files
for g in resume baseball-card links match results outreach value; do
  node -e 'const f=process.argv[1],p=require(f);delete p.scripts.test;require("fs").writeFileSync(f,JSON.stringify(p,null,2)+"\n")' "$PWD/build/recruit-rocket/generators/$g/package.json"
done
# Final scrub: no personal names, emails, phone numbers, employers, or test companies in the zip.
# The term list lives in .github/ (never synced publicly). Only the version-check URL may name
# the public repo's owner.
if [ -f .github/scrub-terms.txt ]; then
  hits=$(grep -v '^#' .github/scrub-terms.txt | sed '/^$/d' | while read -r term; do
    { grep -rIil -w -- "$term" build/recruit-rocket || true; } | sed "s|^build/|$term: |"
  done || true)
  [ -z "$hits" ] || { echo "Scrub failed:"; echo "$hits"; exit 1; }
fi
phones=$(grep -rIhoE '\(?[0-9]{3}\)?[ .-][0-9]{3}[ .-][0-9]{4}' build/recruit-rocket | grep -vE '555[ .-][0-9]{4}' | sort -u || true)
[ -z "$phones" ] || { echo "Scrub failed: phone numbers that are not fictional 555 numbers:"; echo "$phones"; exit 1; }
emails=$(grep -rIhoE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}' build/recruit-rocket | grep -vE '@(example\.com|[a-z0-9.-]*\.example|linkedin\.com)$' | grep -vE '^(jobalerts-noreply|jobs-noreply)@' | sort -u || true)
[ -z "$emails" ] || { echo "Scrub failed: email addresses that are not fictional:"; echo "$emails"; exit 1; }

# Fixed timestamps so an unchanged skill builds a byte-identical zip
find build/recruit-rocket -exec touch -t 202601010000 {} +
(cd build && find recruit-rocket | sort | zip -qX -@ ../dist/recruit-rocket.zip)
rm -rf build
echo "dist/recruit-rocket.zip"
