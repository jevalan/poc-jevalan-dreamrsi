import assert from "node:assert/strict";
import test from "node:test";
import { optimizePolicy, replayPolicy } from "../src/learning.mjs";

const training = [
  { id: "review-1", partition: "train", request: "inspect code defect", expected_fit: "review" },
  { id: "routing-1", partition: "train", request: "choose tool specialist", expected_fit: "routing" },
];

test("optimizer rejects holdout data", () => {
  assert.throws(
    () => optimizePolicy([...training, {
      id: "review-holdout", partition: "holdout", request: "review code", expected_fit: "review",
    }]),
    /train cases only/,
  );
});

test("optimization and replay are deterministic and retain label provenance", () => {
  const first = optimizePolicy(training);
  const second = optimizePolicy(training);
  assert.deepEqual(first, second);

  const replay = replayPolicy(first.selected.policy, training);
  assert.equal(replay.length, training.length);
  assert.ok(replay.every((item) => item.observationKind === "curated_expected_fit"));
  assert.ok(replay.every((item) => item.candidateOutcome === null));
});
