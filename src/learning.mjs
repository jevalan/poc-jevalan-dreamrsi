const ALPHAS = [0.25, 0.5, 1, 2];

function validateCases(cases, requiredPartition) {
  if (!Array.isArray(cases) || cases.length === 0) {
    throw new TypeError("cases must be a non-empty array");
  }
  const ids = new Set();
  for (const [index, item] of cases.entries()) {
    if (!item || typeof item !== "object") throw new TypeError(`cases[${index}] must be an object`);
    if (item.partition !== requiredPartition) {
      throw new Error(`optimizer accepts train cases only: ${item.id ?? index}`);
    }
    if (typeof item.id !== "string" || !item.id.trim() || ids.has(item.id)) {
      throw new TypeError(`cases[${index}].id must be unique and non-empty`);
    }
    if (typeof item.request !== "string" || !item.request.trim()) {
      throw new TypeError(`cases[${index}].request must be non-empty`);
    }
    if (typeof item.expected_fit !== "string" || !item.expected_fit.trim()) {
      throw new TypeError(`cases[${index}].expected_fit must be non-empty`);
    }
    ids.add(item.id);
  }
}

function tokens(text) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .match(/[a-z0-9]+/g) ?? [];
}

function makePolicy(cases, alpha) {
  const classes = [...new Set(cases.map((item) => item.expected_fit))].sort();
  const counts = Object.fromEntries(classes.map((fit) => [fit, {}]));
  const totals = Object.fromEntries(classes.map((fit) => [fit, 0]));
  const vocabulary = new Set();

  for (const item of cases) {
    for (const token of tokens(item.request)) {
      counts[item.expected_fit][token] = (counts[item.expected_fit][token] ?? 0) + 1;
      totals[item.expected_fit] += 1;
      vocabulary.add(token);
    }
  }

  return {
    schema: "dream-sri/policy-v1",
    version: "optimized-naive-bayes-v1",
    algorithm: "multinomial-naive-bayes",
    parameters: { alpha },
    classes,
    vocabulary: [...vocabulary].sort(),
    classDocumentCounts: Object.fromEntries(classes.map((fit) => [fit, cases.filter((item) => item.expected_fit === fit).length])),
    tokenCounts: counts,
    tokenTotals: totals,
  };
}

export function predictFit(policy, request) {
  if (!policy || policy.schema !== "dream-sri/policy-v1" || !Array.isArray(policy.classes)) {
    throw new TypeError("invalid policy");
  }
  if (typeof request !== "string" || !request.trim()) throw new TypeError("request must be non-empty");

  const words = tokens(request);
  const vocabularySize = Math.max(policy.vocabulary.length, 1);
  let bestFit = null;
  let bestScore = -Infinity;
  for (const fit of policy.classes) {
    const docs = policy.classDocumentCounts[fit];
    const classCount = policy.classes.length;
    const score = Math.log((docs + 1) / (Object.values(policy.classDocumentCounts).reduce((sum, n) => sum + n, 0) + classCount))
      + words.reduce((sum, token) => {
        const count = policy.tokenCounts[fit][token] ?? 0;
        const denominator = policy.tokenTotals[fit] + policy.parameters.alpha * vocabularySize;
        return sum + Math.log((count + policy.parameters.alpha) / denominator);
      }, 0);
    if (score > bestScore) {
      bestFit = fit;
      bestScore = score;
    }
  }
  return bestFit;
}

export function replayPolicy(policy, cases, labelKind = "curated_expected_fit") {
  if (!Array.isArray(cases)) throw new TypeError("cases must be an array");
  return cases.map((item) => {
    if (!item || typeof item.id !== "string" || typeof item.expected_fit !== "string") {
      throw new TypeError("each replay case needs id and expected_fit");
    }
    const predictedFit = predictFit(policy, item.request);
    return {
      caseId: item.id,
      partition: item.partition,
      predictedFit,
      expectedFit: item.expected_fit,
      labelMatch: predictedFit === item.expected_fit,
      observationKind: labelKind,
      candidateOutcome: null,
    };
  });
}

export function optimizePolicy(cases) {
  validateCases(cases, "train");
  const candidates = ALPHAS.map((alpha) => {
    const policy = makePolicy(cases, alpha);
    const experiences = replayPolicy(policy, cases);
    const correct = experiences.filter((item) => item.labelMatch).length;
    return {
      policy,
      training: {
        cases: cases.map((item) => item.id),
        correct,
        total: cases.length,
        accuracy: correct / cases.length,
      },
      experiences,
    };
  });
  candidates.sort((a, b) => b.training.accuracy - a.training.accuracy
    || a.policy.parameters.alpha - b.policy.parameters.alpha);

  return {
    schema: "dream-sri/optimization-v1",
    method: "bounded-alpha-grid-search",
    objective: "training_accuracy_on_curated_expected_fit_labels",
    search: candidates.map(({ policy, training }) => ({ alpha: policy.parameters.alpha, ...training })),
    selected: candidates[0],
  };
}
