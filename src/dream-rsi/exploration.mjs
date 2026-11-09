import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { randomUUID } from "node:crypto";
import {
  CANDIDATES,
  evaluateSystemOneFailure,
  evaluateSystemOneResponse,
  EVALUATOR_ID,
  makeSystemOneRequest,
} from "./evaluator.mjs";

const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

async function saveAttempt({ task, profile, worldId, branch, runsDir }) {
  const id = randomUUID();
  const runDir = resolve(runsDir, id);
  const request = makeSystemOneRequest(task, profile);
  const startedAt = new Date().toISOString();
  const started = performance.now();
  let responseText = "";
  let httpStatus = null;
  let evaluated;
  let outcome = null;

  await mkdir(runDir, { recursive: false });
  await writeFile(resolve(runDir, "request.json"), json(request), { flag: "wx" });
  try {
    const response = await fetch(CANDIDATES[profile].url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(30_000),
    });
    httpStatus = response.status;
    responseText = await response.text();
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${responseText.slice(0, 2000)}`);
    let decoded;
    try { decoded = JSON.parse(responseText); }
    catch { throw new Error("backend returned invalid JSON"); }
    evaluated = evaluateSystemOneResponse(task, decoded);
    if (evaluated.error) outcome = "invalid_response";
    else outcome = "classified";
  } catch (error) {
    evaluated = evaluateSystemOneFailure(error.message);
    outcome = "backend_error";
  }

  const finishedAt = new Date().toISOString();
  const durationMs = Math.round(performance.now() - started);
  const manifest = {
    id,
    kind: "exploration-attempt",
    profile,
    model: CANDIDATES[profile].model,
    taskId: task.id,
    worldId,
    branch,
    attempt: 0,
    parentId: null,
    status: outcome === "classified" ? "completed" : "failed",
    outcome,
    startedAt,
    finishedAt,
    durationMs,
    httpStatus,
    evaluator: EVALUATOR_ID,
    expectedFit: task.expected_fit,
    predictedFit: evaluated.predictedFit,
    confidence: evaluated.confidence,
    reward: evaluated.reward,
    error: evaluated.error,
    request: "request.json",
    stdout: "stdout.log",
    stderr: "stderr.log",
  };
  await writeFile(resolve(runDir, "stdout.log"), `${responseText || "(sin cuerpo de respuesta)"}\n`, { flag: "wx" });
  await writeFile(resolve(runDir, "stderr.log"), `${evaluated.error || ""}\n`, { flag: "wx" });
  await writeFile(resolve(runDir, "manifest.json"), json(manifest), { flag: "wx" });
  return manifest;
}

export async function exploreTask({ taskId, tasks, runsDir }) {
  const task = tasks.find((item) => item.id === taskId);
  if (!task) throw new Error("unknown task id");
  const worldId = randomUUID();
  const startedAt = new Date().toISOString();
  const profiles = Object.keys(CANDIDATES);

  const attempts = await Promise.all(profiles.map((profile, branch) =>
    saveAttempt({ task, profile, worldId, branch, runsDir }),
  ));
  const finishedAt = new Date().toISOString();
  const trace = {
    schema: "dream-rsi/jevalan-trace-v1",
    id: worldId,
    kind: "online_exploration",
    policy: "parallel_refine-v1",
    evaluator: EVALUATOR_ID,
    dataset: "data/tasks.json",
    task: { id: task.id, request: task.request, expectedFit: task.expected_fit },
    candidates: profiles.map((profile, branch) => ({ profile, model: CANDIDATES[profile].model, branch })),
    startedAt,
    finishedAt,
    attempts: attempts.map(({ id, profile, model, branch, attempt, status, outcome, durationMs, httpStatus, expectedFit, predictedFit, confidence, reward, error }) => ({
      id, profile, model, branch, attempt, parentId: null, status, outcome,
      durationMs, httpStatus, expectedFit, predictedFit, confidence, reward, error,
    })),
  };
  const traceDir = resolve(runsDir, "trace-pool", worldId);
  await mkdir(resolve(runsDir, "trace-pool"), { recursive: true });
  await mkdir(traceDir, { recursive: false });
  await writeFile(resolve(traceDir, "trace.json"), json(trace), { flag: "wx" });
  return trace;
}

export async function listTraces(runsDir) {
  let entries;
  try { entries = await readdir(resolve(runsDir, "trace-pool"), { withFileTypes: true }); }
  catch (error) { if (error.code === "ENOENT") return []; throw error; }
  const traces = await Promise.all(entries.filter((entry) => entry.isDirectory()).map(async (entry) => {
    try { return JSON.parse(await readFile(resolve(runsDir, "trace-pool", entry.name, "trace.json"), "utf8")); }
    catch { return null; }
  }));
  return traces.filter(Boolean).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}
