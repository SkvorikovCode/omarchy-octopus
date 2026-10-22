// node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Model.js is a QML JavaScript library: drop its `.pragma library` line and run it as CommonJS.
const source = readFileSync(new URL("../Model.js", import.meta.url), "utf8").replace(/^\.pragma library\s*$/m, "");
const module = { exports: {} };
new Function("module", source)(module);
const Model = module.exports;

const file = (over = {}) =>
  JSON.stringify({
    format: 1,
    pid: 42,
    updatedAt: 1,
    agents: [
      { sessionId: "a", title: "Fix login", project: "/home/u/app", status: "waiting", unread: false, since: 1000 },
      { sessionId: "b", title: "Docs", project: "/home/u/app", branch: "octopus/docs", status: "working", since: 2000 },
    ],
    counts: { working: 1, waiting: 1, unread: 0 },
    ...over,
  });

test("parses the status file", () => {
  const s = Model.parseStatus(file());
  assert.equal(s.ok, true);
  assert.equal(s.pid, 42);
  assert.deepEqual(s.counts, { working: 1, waiting: 1, unread: 0 });
  assert.equal(s.agents[1].branch, "octopus/docs");
});

test("rejects unreadable files and other formats", () => {
  assert.equal(Model.parseStatus("{").ok, false);
  assert.equal(Model.parseStatus("").ok, false);
  assert.match(Model.parseStatus(file({ format: 2 })).error, /format 2/);
});

test("treats unknown statuses as idle and clips titles", () => {
  const s = Model.parseStatus(file({ agents: [{ status: "dancing", title: "x".repeat(200) }] }));
  assert.equal(s.agents[0].status, "idle");
  assert.equal(s.agents[0].title.length, 80);
});

test("the icon level: off unless running, then waiting over working over idle", () => {
  const s = Model.parseStatus(file());
  assert.equal(Model.level({ ...s, running: false }), "off");
  assert.equal(Model.level({ ...s, running: true }), "waiting");
  assert.equal(Model.level({ ...s, running: true, counts: { working: 2, waiting: 0, unread: 0 } }), "working");
  assert.equal(Model.level({ ...s, running: true, counts: { working: 0, waiting: 0, unread: 0 } }), "idle");
});

test("tooltips name the most urgent state", () => {
  const s = { ...Model.parseStatus(file()), running: true };
  assert.equal(Model.tooltip(s), "1 agent waits for your answer");
  assert.equal(Model.tooltip({ ...s, running: false }), "Octopus is not running · click to open");
  assert.equal(Model.tooltip({ ...s, counts: { working: 3, waiting: 0, unread: 0 } }), "3 agents working");
});

test("helpers", () => {
  assert.equal(Model.projectName("/home/u/app/"), "app");
  assert.equal(Model.projectName(""), "");
  assert.equal(Model.elapsed(1000, 1000 + 192000), "3:12");
  assert.equal(Model.elapsed(1000, 1000 + 3723000), "1:02:03");
  assert.equal(Model.elapsed(0, 5000), "");
  assert.equal(Model.elapsed(5000, 1000), "");
  assert.equal(Model.statusLabel({ status: "idle", unread: true }), "Done · unread");
});
