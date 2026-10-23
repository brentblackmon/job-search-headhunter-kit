#!/usr/bin/env node
// Regression tests for render-card.js. Run with: npm test
// Each case renders the fictional sample card with a few changes, then reads the QA
// lines the script prints. Needs the same tools as the script.

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.join(__dirname, "..");
const sample = JSON.parse(fs.readFileSync(path.join(root, "sample-data", "card.json"), "utf8"));
const work = fs.mkdtempSync(path.join(os.tmpdir(), "rr-card-test-"));

function render(name, change) {
  const data = JSON.parse(JSON.stringify(sample));
  change(data);
  // The sample photo lives next to the sample card; point to it from the temp folder.
  if (data.photo && fs.existsSync(path.join(root, "sample-data", data.photo))) data.photo = path.join(root, "sample-data", data.photo);
  const dataPath = path.join(work, `${name}.json`);
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  const out = spawnSync("node", [path.join(root, "render-card.js"), "--data", dataPath, "--out", path.join(work, `${name}.pdf`)], { encoding: "utf8" });
  const text = out.stdout + out.stderr;
  const check = (label) => {
    const line = text.split("\n").find((l) => l.includes(`] ${label}`)) || "";
    return line.includes("[PASS]") ? "PASS" : line.includes("[FAIL]") ? "FAIL" : "MISSING";
  };
  return { text, check, status: out.status };
}

const results = [];
function expect(caseName, actual, wanted) {
  results.push({ caseName, ok: actual === wanted, actual, wanted });
}

// 1. The sample card has no placeholders.
{
  const r = render("sample", () => {});
  expect("sample card passes the placeholder check", r.check("No unfilled placeholders"), "PASS");
}

// 2. The headshot is required: an empty photo or a missing file fails, with the fix in the message.
{
  const ok = render("with-photo", () => {});
  expect("sample card with a photo passes the headshot check", ok.check("Headshot"), "PASS");
  const none = render("no-photo", (d) => { d.photo = ""; });
  expect("an empty photo fails the headshot check", none.check("Headshot"), "FAIL");
  expect("the message says how to add one", none.text.includes("Add a photo to your folder and say: use [file] as my headshot.") ? "says" : "missing", "says");
  const gone = render("missing-photo", (d) => { d.photo = "not-here.jpg"; });
  expect("a photo file that does not exist fails", gone.check("Headshot"), "FAIL");
  expect("a missing photo makes the script exit with an error", gone.status === 0 ? "exit 0" : "exit 1", "exit 1");
}

// 3. Placeholders left in the contact line fail QA.
{
  const r = render("placeholders", (d) => {
    d.contact = ["[phone]", "[email]", "linkedin.com/in/tester-example"];
  });
  expect("[phone] and [email] in the contact line fail", r.check("No unfilled placeholders"), "FAIL");
  expect("the script exits with an error", r.status === 0 ? "exit 0" : "exit 1", "exit 1");
}

// 4. Student card: skills and experience tiles in place of numeric stats.
{
  const stu = JSON.parse(fs.readFileSync(path.join(root, "sample-data", "card-student.json"), "utf8"));
  const renderStudent = (name, change) => render(name, (d) => { Object.keys(d).forEach((k) => delete d[k]); Object.assign(d, JSON.parse(JSON.stringify(stu))); change(d); });
  const ok = renderStudent("student", () => {});
  expect("a student card with 4 tiles passes the layout check", ok.check("Layout"), "PASS");
  expect("the layout line says skill tiles", ok.text.includes("4 skill tiles") ? "tiles" : "other", "tiles");
  const three = renderStudent("student-3", (d) => { d.tiles = d.tiles.slice(0, 3); });
  expect("3 tiles fail the layout check", three.check("Layout"), "FAIL");
}

// Both sample cards are labeled as fictional samples, in the file and on the printed card.
{
  for (const f of ["card.json", "card-student.json"]) {
    const d = require(`../sample-data/${f}`);
    expect(`${f} has a FICTIONAL SAMPLE note`, /^FICTIONAL SAMPLE\./.test(d._note || ""), true);
  }
  expect("the student card says fictional on the printed card", /fictional/i.test(require("../sample-data/card-student.json").intro), true);
}

// No intro or card body ends with a last line of 1 or 2 words.
{
  const { shortLastLines } = require("../render-card");
  const L = (x, y, text) => ({ x, y, words: text.split(" ") });
  const body = [{ label: "section 2 card 2 body", text: "Grew the implementation team and hired the first two managers from within." }];
  expect("a body whose last line is 1 word fails", shortLastLines([L(229, 640, "Grew the implementation team and hired the first"), L(229, 651, "two managers from"), L(229, 662, "within.")], body).length, 1);
  expect("a body whose last line is 2 words fails", shortLastLines([L(229, 640, "Grew the implementation team and hired the first two managers"), L(229, 651, "from within.")], body).length, 1);
  expect("a body whose last line is 3 words passes", shortLastLines([L(229, 640, "Grew the implementation team and hired the first two"), L(229, 651, "managers from within.")], body).length, 0);
  expect("a one-line body passes", shortLastLines([L(46, 343, "Cut game packages in Adobe Premiere Pro.")], [{ label: "b", text: "Cut game packages in Adobe Premiere Pro." }]).length, 0);
  expect("a line in another column is not part of the body", shortLastLines([L(229, 640, "Grew the implementation team and hired the first two managers from"), L(412, 651, "within.")], body).length, 0);
  const real = render("short-last-line", (d) => { d.sections[1].cards[1].body = "Grew the implementation team at Kestrel Route Software and hired the first two managers from within."; });
  expect("a card body ending in 1 word fails QA", real.check("No body text ends with 1 or 2 words on its last line"), "FAIL");
  expect("the failure names the card and the short line", real.text.includes('section 2 card 2 body ends with "within."') ? "named" : "missing", "named");
  expect("a short last line makes the script exit with an error", real.status === 0 ? "exit 0" : "exit 1", "exit 1");
  expect("the sample card has no short last lines", render("short-ok", () => {}).check("No body text ends with 1 or 2 words on its last line"), "PASS");
}

fs.rmSync(work, { recursive: true, force: true });
// The proof line must not repeat the card title.
{
  const { repeatsTitle } = require("../render-card");
  expect('"Services revenue up" over "Up 25%" is caught', repeatsTitle("Services revenue up", "Up 25%"), true);
  expect('"On time, every day" over "91% to 98.5% on time." is caught', repeatsTitle("On time, every day", "91% to 98.5% on time."), true);
  expect('"Faster go-lives" over "16 weeks to 9 weeks." passes', repeatsTitle("Faster go-lives", "16 weeks to 9 weeks."), false);
  expect('"Fewer defects" over "Go-live defects down 45%." passes', repeatsTitle("Fewer defects", "Go-live defects down 45%."), false);
}

// No slogans; the title line is the target title only.
{
  const { sloganProblems, noSlogans } = require("../render-card");
  const n = (t) => sloganProblems("x", t, { fragments: true }).length;
  expect('"Profitable services. AI past R&D." is a slogan', n("Profitable services. AI past R&D."), 1);
  expect('"Agents doing real work, not pilots." is a slogan', n("Agents doing real work, not pilots."), 1);
  expect('"Run it like an owner. Put AI to work everywhere." is a slogan', n("Run it like an owner. Put AI to work everywhere."), 1);
  expect('"AI in support, sales and the back office" is a plain fact', n("AI in support, sales and the back office"), 0);
  const card = JSON.parse(JSON.stringify(require("../sample-data/card.json")));
  card.role = "Chief Operating Officer / Northpeak Software";
  expect("a title line naming the target company fails", noSlogans(card).some((p) => p.includes("role line")), true);
  expect("the sample card has no slogans", noSlogans(require("../sample-data/card.json")).length, 0);
  expect("the student sample card has no slogans", noSlogans(require("../sample-data/card-student.json")).length, 0);
}

// The headline and intro come from the best-fit value statement.
{
  const { valueProblems } = require("../render-card");
  const card = require("../sample-data/card.json");
  expect("the sample card carries its value statement", valueProblems(card).length, 0);
  expect("the student sample card carries its value statement", valueProblems(require("../sample-data/card-student.json")).length, 0);
  expect("a card with no valueStatement fails", valueProblems({ ...card, valueStatement: undefined }).some((p) => p.includes("no valueStatement")), true);
  expect("an intro without the statement's result fails", valueProblems({ ...card, intro: "Most recently Director of Operations at Tidewater Freight Systems." }).some((p) => p.includes("result")), true);
  expect("a headline and intro unrelated to the statement fail", valueProblems({ ...card, headline: "Freight software operations", headlineAccent: "for growing carriers.", intro: "Director of Operations at Tidewater Freight Systems since 2019." }).some((p) => p.includes("do not come from")), true);
}

let failed = 0;
for (const r of results) {
  console.log(`${r.ok ? "ok  " : "FAIL"} ${r.caseName}${r.ok ? "" : ` (got ${r.actual}, wanted ${r.wanted})`}`);
  if (!r.ok) failed++;
}
console.log(`\n${results.length - failed} of ${results.length} passed`);
process.exit(failed ? 1 : 0);
