import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { loadCatalog } from "../src/catalog.mjs";

test("catalog loader joins assessments by case-insensitive repo and skips external rows", async () => {
  const dir = await mkdtemp(join(tmpdir(), "dream-sri-catalog-"));
  try {
    const catalogPath = join(dir, "catalog.json");
    const assessmentsPath = join(dir, "assessments.json");
    await writeFile(catalogPath, JSON.stringify({
      updated: "2026-10-07",
      source: "fixture",
      projects: [{ repo: "Owner/Tool" }],
    }));
    await writeFile(assessmentsPath, JSON.stringify({
      updated: "2026-10-31",
      assessments: [
        { repo: "owner/tool", in_catalog: true, decision: "yes", fit: "routing", evidence: "static" },
        { repo: "outside/tool", in_catalog: false },
      ],
    }));

    const loaded = await loadCatalog(catalogPath, assessmentsPath);
    assert.equal(loaded.source, "fixture");
    assert.equal(loaded.candidates.length, 1);
    assert.deepEqual(loaded.candidates[0], {
      repo: "Owner/Tool", decision: "yes", fit: "routing", evidence: "static",
    });
    assert.equal((await readFile(catalogPath, "utf8")).includes("Owner/Tool"), true);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("catalog loader rejects an in-catalog assessment without its project", async () => {
  const dir = await mkdtemp(join(tmpdir(), "dream-sri-catalog-"));
  try {
    const catalogPath = join(dir, "catalog.json");
    const assessmentsPath = join(dir, "assessments.json");
    await writeFile(catalogPath, JSON.stringify({ projects: [] }));
    await writeFile(assessmentsPath, JSON.stringify({ assessments: [
      { repo: "missing/tool", in_catalog: true, decision: "yes", fit: "routing", evidence: "static" },
    ] }));
    await assert.rejects(loadCatalog(catalogPath, assessmentsPath), /catalog project missing/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
