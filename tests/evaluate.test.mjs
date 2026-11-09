import assert from "node:assert/strict";
import test from "node:test";
import { evaluatePolicies } from "../src/evaluate.mjs";

const training = [
  { id: "review-train", partition: "train", request: "inspect code defect", expected_fit: "review" },
  { id: "routing-train", partition: "train", request: "choose tool specialist", expected_fit: "routing" },
];
const holdout = [
  { id: "review-holdout", partition: "holdout", request: "find a parser bug", expected_fit: "review" },
  { id: "routing-holdout", partition: "holdout", request: "select a specialist", expected_fit: "routing" },
];

test("evaluation compares both policies on the identical holdout", () => {
  const report = evaluatePolicies(training, holdout);
  assert.equal(report.comparison.sameHoldoutCases, true);
  assert.deepEqual(report.baseline.predictions.map((item) => item.caseId), report.holdoutCaseIds);
  assert.deepEqual(report.optimized.predictions.map((item) => item.caseId), report.holdoutCaseIds);
  assert.equal(report.baseline.metrics.total, report.optimized.metrics.total);
  assert.equal(report.optimized.metrics.coverage, 1);
});

test("evaluation rejects holdout leakage and overlapping case IDs", () => {
  assert.throws(() => evaluatePolicies([...training, holdout[0]], holdout), /expected train case/);
  assert.throws(() => evaluatePolicies(training, [{ ...holdout[0], id: training[0].id }, holdout[1]]), /train and holdout/);
});
