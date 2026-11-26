import { test } from "node:test";
import assert from "node:assert/strict";
import { normaliseProjectKey, parseTaskKey, suggestProjectKey, taskKey } from "../lib/tasks/keys";

test("suggests keys from project names (same as the backfill)", () => {
  assert.equal(suggestProjectKey("Janta Nivesh V2"), "JNV2");
  assert.equal(suggestProjectKey("JP Interio"), "JPI");
  assert.equal(suggestProjectKey("KavachX"), "KX");
  assert.equal(suggestProjectKey("Panthar Marketing and Sales"), "PMS");
  assert.equal(suggestProjectKey("Orion kids Prototype Project"), "OKP");
  assert.equal(suggestProjectKey("website"), "WEB");
  assert.equal(suggestProjectKey("!!!"), "PRJ");
});

test("validates typed keys", () => {
  assert.equal(normaliseProjectKey(" jnv "), "JNV");
  assert.equal(normaliseProjectKey("J"), null);
  assert.equal(normaliseProjectKey("1AB"), null);
  assert.equal(normaliseProjectKey("ABCDEFG"), null);
});

test("formats and parses task IDs", () => {
  assert.equal(taskKey({ number: 24, project: { key: "JNV" } }), "JNV-24");
  assert.equal(taskKey({ number: null, project: { key: "JNV" } }), null);
  assert.deepEqual(parseTaskKey("jnv-24"), { key: "JNV", number: 24 });
  assert.equal(parseTaskKey("JNV 24"), null);
});
