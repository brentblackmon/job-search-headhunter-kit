#!/usr/bin/env bash
# Builds dist/skills/<name>.zip for uploading in the Claude app, plus dist/all-skills.zip.
# Each zip holds one top-level folder named after the skill, with SKILL.md inside.
# Every skill also gets a copy of STANDING_RULES.md; resume-builder and baseball-card
# get their generator so the locked layouts travel with the skill.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf dist/skills dist/all-skills.zip build/skills
mkdir -p dist/skills build/skills
for dir in plugin/skills/*/; do
  name="$(basename "$dir")"
  cp -r "$dir" "build/skills/$name"
  cp plugin/STANDING_RULES.md "build/skills/$name/STANDING_RULES.md"
done
mkdir -p build/skills/resume-builder/generator build/skills/baseball-card/generator
cp -r generators/resume/{build-resume.js,qa.js,package.json,sample-data} build/skills/resume-builder/generator/
cp -r generators/baseball-card/{card-template.html,render-card.js,package.json,sample-data} build/skills/baseball-card/generator/
for dir in build/skills/*/; do
  name="$(basename "$dir")"
  (cd build/skills && zip -qr "../../dist/skills/${name}.zip" "$name")
  echo "dist/skills/${name}.zip"
done
(cd dist/skills && zip -qr ../all-skills.zip ./*.zip)
echo "dist/all-skills.zip"
rm -rf build
# Templates zip used by the setup message, with its own copy of the rules
cp plugin/STANDING_RULES.md templates/STANDING_RULES.md
rm -f dist/recruit-rocket-templates.zip
zip -qr dist/recruit-rocket-templates.zip templates
echo "dist/recruit-rocket-templates.zip"
