function compareRepo(a, b) {
  const left = a.repo.toLowerCase();
  const right = b.repo.toLowerCase();
  return left < right ? -1 : left > right ? 1 : 0;
}

export function decideBaseline({ fit, candidates }) {
  if (typeof fit !== "string" || !fit.trim()) {
    throw new TypeError("fit must be a non-empty string");
  }
  if (!Array.isArray(candidates)) throw new TypeError("candidates must be an array");

  for (const [index, candidate] of candidates.entries()) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      throw new TypeError(`candidates[${index}] must be an object`);
    }
    if (typeof candidate.repo !== "string" || !candidate.repo.trim()) {
      throw new TypeError(`candidates[${index}].repo must be a non-empty string`);
    }
    if (typeof candidate.fit !== "string" || !candidate.fit.trim()) {
      throw new TypeError(`candidates[${index}].fit must be a non-empty string`);
    }
    if (!["yes", "no", "unclear"].includes(candidate.decision)) {
      throw new TypeError(`candidates[${index}].decision is invalid`);
    }
    if (!["static", "measured"].includes(candidate.evidence)) {
      throw new TypeError(`candidates[${index}].evidence is invalid`);
    }
  }

  const eligible = candidates
    .filter((candidate) => candidate.decision === "yes" && candidate.fit === fit.trim())
    .toSorted(compareRepo);
  const selected = eligible[0] ?? null;

  return {
    schema: "dream-sri/decision-v1",
    policy: "baseline-v1",
    selectionRule: "decision_yes_fit_exact_repo_id_ascending",
    fit: fit.trim(),
    status: selected ? "selected" : "abstain",
    candidate: selected?.repo ?? null,
    candidateEvidence: selected?.evidence ?? null,
    reasons: selected ? ["decision_yes", "fit_match"] : ["no_candidate_for_fit"],
  };
}
