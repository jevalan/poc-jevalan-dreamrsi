import { readFile } from "node:fs/promises";

function object(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  return value;
}

function repoId(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${label}.repo must be a non-empty string`);
  }
  return value.trim();
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

export async function loadCatalog(catalogPath, assessmentsPath) {
  const [catalog, assessments] = await Promise.all([
    readJson(catalogPath),
    readJson(assessmentsPath),
  ]);
  object(catalog, "catalog");
  object(assessments, "assessments document");
  if (!Array.isArray(catalog.projects) || !Array.isArray(assessments.assessments)) {
    throw new TypeError("catalog.projects and assessments.assessments must be arrays");
  }

  const projects = new Map();
  for (const [index, raw] of catalog.projects.entries()) {
    const project = object(raw, `catalog.projects[${index}]`);
    if (typeof project.repo !== "string" || !project.repo.trim()) continue;
    const id = project.repo.trim().toLowerCase();
    if (projects.has(id)) throw new Error(`duplicate catalog repo: ${project.repo}`);
    projects.set(id, project);
  }

  const candidates = [];
  const seenAssessments = new Set();
  for (const [index, raw] of assessments.assessments.entries()) {
    const assessment = object(raw, `assessments.assessments[${index}]`);
    if (assessment.in_catalog !== true) continue;
    const repo = repoId(assessment.repo, `assessments.assessments[${index}]`);
    if (!["yes", "no", "unclear"].includes(assessment.decision)) {
      throw new TypeError(`invalid decision for assessment: ${repo}`);
    }
    if (typeof assessment.fit !== "string" || !assessment.fit.trim()) {
      throw new TypeError(`invalid fit for assessment: ${repo}`);
    }
    if (!["static", "measured"].includes(assessment.evidence)) {
      throw new TypeError(`invalid evidence for assessment: ${repo}`);
    }
    const id = repo.toLowerCase();
    if (seenAssessments.has(id)) throw new Error(`duplicate assessment repo: ${repo}`);
    seenAssessments.add(id);
    const project = projects.get(id);
    if (!project) throw new Error(`catalog project missing for assessment: ${repo}`);

    candidates.push({
      repo: project.repo,
      decision: assessment.decision,
      fit: assessment.fit.trim(),
      evidence: assessment.evidence,
    });
  }

  return {
    catalogUpdated: catalog.updated ?? null,
    assessmentsUpdated: assessments.updated ?? null,
    source: catalog.source ?? null,
    candidates,
  };
}
