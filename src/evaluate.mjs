import { optimizePolicy, replayPolicy } from "./learning.mjs";

function validatePartition(cases, partition) {
  if (!Array.isArray(cases) || cases.length === 0) {
    throw new TypeError(`${partition} cases must be a non-empty array`);
  }
  const ids = new Set();
  for (const [index, item] of cases.entries()) {
    if (item?.partition !== partition) throw new Error(`expected ${partition} case at index ${index}`);
    if (typeof item.id !== "string" || ids.has(item.id)) throw new TypeError(`${partition} case IDs must be unique`);
    if (typeof item.expected_fit !== "string" || !item.expected_fit.trim()) {
      throw new TypeError(`${partition} case ${item.id} needs expected_fit`);
    }
    ids.add(item.id);
  }
  return ids;
}

function summarize(predictions) {
  const correct = predictions.filter((item) => item.labelMatch).length;
  const covered = predictions.filter((item) => item.predictedFit !== null).length;
  return {
    correct,
    total: predictions.length,
    accuracy: correct / predictions.length,
    coverage: covered / predictions.length,
    abstentions: predictions.length - covered,
  };
}

export function evaluatePolicies(training, holdout) {
  const trainingIds = validatePartition(training, "train");
  const holdoutIds = validatePartition(holdout, "holdout");
  for (const id of holdoutIds) {
    if (trainingIds.has(id)) throw new Error(`case appears in train and holdout: ${id}`);
  }

  const classes = [...new Set(training.map((item) => item.expected_fit))].sort();
  for (const item of holdout) {
    if (!classes.includes(item.expected_fit)) {
      throw new Error(`holdout label is absent from train: ${item.expected_fit}`);
    }
  }

  const majorityCounts = new Map(classes.map((fit) => [fit, 0]));
  for (const item of training) majorityCounts.set(item.expected_fit, majorityCounts.get(item.expected_fit) + 1);
  const majorityFit = classes.sort((a, b) => majorityCounts.get(b) - majorityCounts.get(a)
    || (a < b ? -1 : a > b ? 1 : 0))[0];
  const baselinePredictions = holdout.map((item) => ({
    caseId: item.id,
    partition: item.partition,
    predictedFit: majorityFit,
    expectedFit: item.expected_fit,
    labelMatch: majorityFit === item.expected_fit,
    observationKind: "curated_expected_fit",
    candidateOutcome: null,
  }));

  const optimization = optimizePolicy(training);
  const optimizedPredictions = replayPolicy(optimization.selected.policy, holdout);
  const baseline = {
    policy: "majority-fit-v1",
    prediction: majorityFit,
    metrics: summarize(baselinePredictions),
    predictions: baselinePredictions,
  };
  const optimized = {
    policy: optimization.selected.policy.version,
    parameters: optimization.selected.policy.parameters,
    trainingAccuracy: optimization.selected.training.accuracy,
    metrics: summarize(optimizedPredictions),
    predictions: optimizedPredictions,
  };

  return {
    schema: "dream-sri/evaluation-v1",
    target: "expected_fit_classification",
    trainingCaseIds: [...trainingIds],
    holdoutCaseIds: [...holdoutIds],
    trainingSearch: optimization.search,
    baseline,
    optimized,
    comparison: {
      accuracyDelta: Number((optimized.metrics.accuracy - baseline.metrics.accuracy).toFixed(6)),
      sameHoldoutCases: baseline.predictions.every((item, index) => item.caseId === optimized.predictions[index].caseId),
    },
    limits: [
      "Labels are curator-assigned intentions on synthetic prompts, not measured tool outcomes.",
      "Five holdout cases are too few to support a generalization claim.",
      "No candidate was executed; cost, latency, and candidate success are not measured.",
    ],
  };
}
