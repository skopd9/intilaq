import { test } from "node:test";
import assert from "node:assert/strict";
import { firstJson, findNamed, idFromRecord, patchDatabaseId } from "./ensure-d1.mjs";

test("firstJson skips wrangler banners", () => {
  const parsed = firstJson("⛅ wrangler\n[{\"name\":\"intilaq\",\"uuid\":\"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa\"}]");
  assert.equal(parsed[0].name, "intilaq");
});

test("findNamed matches D1 list rows", () => {
  const row = findNamed(
    [{ name: "other", uuid: "11111111-1111-4111-8111-111111111111" }, { name: "intilaq", uuid: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }],
    "intilaq"
  );
  assert.equal(idFromRecord(row), "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
});

test("patchDatabaseId replaces only the id", () => {
  const src = `{
  "d1_databases": [
    {
      "database_name": "intilaq",
      "database_id": "00000000-0000-4000-8000-000000000001"
    }
  ]
}`;
  const out = patchDatabaseId(src, "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
  assert.match(out, /"database_id": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"/);
  assert.doesNotMatch(out, /00000000-0000-4000-8000-000000000001/);
});
