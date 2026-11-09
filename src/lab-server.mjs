import { spawn } from "node:child_process";
import { appendFile, copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { isRunId, makeChildEnv, prepareLaunch } from "./lab-core.mjs";
import { exploreTask, listTraces } from "./dream-rsi/exploration.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const runsDir = resolve(root, "runs");
const workspacesDir = resolve(root, "workspaces");
const staticDir = resolve(root, "dist/lab");
const classifierDataset = resolve(runsDir, "programming-classifier.jsonl");
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8" };

async function json(path, fallback) {
  try { return JSON.parse(await readFile(path, "utf8")); }
  catch (error) { if (error.code === "ENOENT") return fallback; throw error; }
}

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, { "content-type": type, "cache-control": "no-store", "x-content-type-options": "nosniff", "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'", "referrer-policy": "no-referrer" });
  res.end(type.startsWith("application/json") ? JSON.stringify(body) : body);
}

async function readBody(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 8192) throw new Error("request body too large");
  }
  return JSON.parse(body || "{}");
}

async function listRuns() {
  let ids;
  try { ids = await readdir(runsDir); } catch (error) { if (error.code === "ENOENT") return []; throw error; }
  const runs = await Promise.all(ids.filter(isRunId).map(async (id) => json(resolve(runsDir, id, "manifest.json"), null)));
  return runs.filter(Boolean).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

async function state() {
  const [dataset, launchers, runs, evaluation, traces, classifierExamples] = await Promise.all([
    json(resolve(root, "data/tasks.json"), { cases: [] }),
    json(resolve(root, "config/launchers.local.json"), { profiles: {} }),
    listRuns(),
    json(resolve(root, "results/evaluation-2026-11-08.json"), null),
    listTraces(runsDir),
    readClassifierDataset(),
  ]);
  return {
    tasks: dataset.cases.map(({ id, partition, request, expected_fit, label_kind }) => ({ id, partition, request, expected_fit, label_kind })),
    profiles: ["laya", "kev"].map((name) => ({ name, configured: Boolean(launchers.profiles?.[name]?.command) })),
    runs,
    traces,
    classifierDataset: {
      total: classifierExamples.length,
      correct: classifierExamples.filter((example) => example.prediction === example.label).length,
      recent: classifierExamples.slice(-20).reverse(),
    },
    evaluation,
    backends: [await backendStatus("laya", "http://127.0.0.1:8021/openapi.json")],
  };
}

async function readClassifierDataset() {
  try {
    return (await readFile(classifierDataset, "utf8")).split("\n").filter(Boolean).map((line) => JSON.parse(line));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function classifyProgramming(prompt) {
  const response = await fetch("http://127.0.0.1:8021/v1/systemone", {
    method: "POST", headers: { "content-type": "application/json" }, signal: AbortSignal.timeout(30_000),
    body: JSON.stringify({
      model: "laya-rl-agent", state: prompt,
      questions: { classification: {
        type: "choice",
        instructions: "Clasifica la intención principal de la petición del usuario.",
        criteria: {
          programming: "Pide crear, modificar, depurar, revisar o probar código, o trabajar directamente sobre un repositorio.",
          other: "Pregunta conceptual, traducción, consejo o planificación que no pide trabajar directamente con código.",
        },
      } },
    }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(`Laya respondió HTTP ${response.status}`);
  const answer = result?.answers?.classification;
  if (!['programming', 'other'].includes(answer?.choice)) throw new Error("Laya no devolvió una clasificación válida");
  return { prediction: answer.choice, confidence: Number.isFinite(answer.answer_confidence) ? answer.answer_confidence : Number.isFinite(answer.probabilities?.[answer.choice]) ? answer.probabilities[answer.choice] : null };
}

async function saveClassifierExample(body) {
  const allowed = ["prompt", "prediction", "label", "confidence"];
  if (!body || Object.keys(body).some((key) => !allowed.includes(key)) ||
      typeof body.prompt !== "string" || !body.prompt.trim() || body.prompt.length > 5000 ||
      !["programming", "other"].includes(body.prediction) || !["programming", "other"].includes(body.label) ||
      (body.confidence !== null && (!Number.isFinite(body.confidence) || body.confidence < 0 || body.confidence > 1))) {
    throw new Error("expected prompt (max 5000 chars), prediction, label and optional confidence");
  }
  const example = { prompt: body.prompt.trim(), prediction: body.prediction, label: body.label, confidence: body.confidence, model: "laya-rl-agent", createdAt: new Date().toISOString() };
  await mkdir(runsDir, { recursive: true });
  await appendFile(classifierDataset, `${JSON.stringify(example)}\n`, { encoding: "utf8" });
  return example;
}

async function backendStatus(name, url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(900) });
    const details = name === "kev" && response.ok ? await response.json() : null;
    return { name, online: response.ok, status: response.status, model: details?.models?.[0]?.name ?? null, device: details?.models?.[0]?.device ?? null };
  } catch {
    return { name, online: false, status: null, model: null, device: null };
  }
}

async function snapshotWorkspace(destination) {
  await mkdir(destination, { recursive: false });
  for (const name of ["src", "data"]) await copyTree(resolve(root, name), resolve(destination, name));
  await copyFile(resolve(root, "package.json"), resolve(destination, "package.json"));
}

async function copyTree(from, to) {
  await mkdir(to, { recursive: true });
  for (const entry of await readdir(from, { withFileTypes: true })) {
    const source = resolve(from, entry.name), target = resolve(to, entry.name);
    if (entry.isDirectory()) await copyTree(source, target);
    else if (entry.isFile()) await copyFile(source, target);
  }
}

async function launch(profileName, taskId) {
  const dataset = await json(resolve(root, "data/tasks.json"), { cases: [] });
  const launchers = await json(resolve(root, "config/launchers.local.json"), { profiles: {} });
  const id = crypto.randomUUID();
  const runDir = resolve(runsDir, id), workspace = resolve(workspacesDir, id);
  const taskFile = resolve(workspace, "task.json");
  const prepared = prepareLaunch({ launchers, profileName, taskId, tasks: dataset.cases, workspace, taskFile });
  await mkdir(runsDir, { recursive: true });
  await mkdir(workspacesDir, { recursive: true });
  await mkdir(runDir, { recursive: false });
  try {
    await snapshotWorkspace(workspace);
    await writeFile(taskFile, JSON.stringify({ id: prepared.task.id, request: prepared.task.request }, null, 2), { flag: "wx" });
    const manifest = { id, kind: "agent", profile: profileName, taskId, status: "running", startedAt: new Date().toISOString(), finishedAt: null, exitCode: null, workspace: `workspaces/${id}`, stdout: "stdout.log", stderr: "stderr.log" };
    await writeFile(resolve(runDir, "manifest.json"), JSON.stringify(manifest, null, 2), { flag: "wx" });
    const stdout = createWriteStream(resolve(runDir, "stdout.log"), { flags: "wx" });
    const stderr = createWriteStream(resolve(runDir, "stderr.log"), { flags: "wx" });
    const child = spawn(prepared.command, prepared.args, { cwd: workspace, env: makeChildEnv(process.env, prepared.envAllowlist), shell: false, windowsHide: true, stdio: ["ignore", stdout, stderr] });
    child.on("error", async (error) => finishRun(runDir, manifest, null, error.message));
    child.on("close", (code) => finishRun(runDir, manifest, code));
    return manifest;
  } catch (error) {
    await writeFile(resolve(runDir, "manifest.json"), JSON.stringify({ id, kind: "agent", profile: profileName, taskId, status: "failed", error: error.message, startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), exitCode: null, stdout: "stdout.log", stderr: "stderr.log" }, null, 2), { flag: "wx" }).catch(() => {});
    throw error;
  }
}

async function finishRun(dir, manifest, code, errorMessage) {
  manifest.status = errorMessage ? "failed" : code === 0 ? "completed" : "failed";
  manifest.exitCode = code;
  manifest.finishedAt = new Date().toISOString();
  if (errorMessage) manifest.error = errorMessage;
  await writeFile(resolve(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
}

const server = createServer(async (req, res) => {
  try {
    const host = (req.headers.host || "").toLowerCase();
    if (!/^(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/.test(host)) return send(res, 403, { error: "local host required" });
    const url = new URL(req.url, "http://127.0.0.1");
    if (req.method === "GET" && url.pathname === "/api/state") return send(res, 200, await state());
    if (req.method === "GET" && url.pathname.startsWith("/api/runs/")) {
      const match = url.pathname.match(/^\/api\/runs\/([0-9a-f-]+)\/(stdout|stderr)$/i);
      if (!match || !isRunId(match[1])) return send(res, 400, { error: "invalid run id" });
      const path = resolve(runsDir, match[1], match[2] === "stdout" ? "stdout.log" : "stderr.log");
      const rootPath = `${runsDir}${sep}`;
      if (!path.startsWith(rootPath)) return send(res, 400, { error: "invalid path" });
      try { return send(res, 200, await readFile(path, "utf8"), "text/plain; charset=utf-8"); }
      catch (error) { if (error.code === "ENOENT") return send(res, 200, "", "text/plain; charset=utf-8"); throw error; }
    }
    if (req.method === "POST" && url.pathname === "/api/launch") {
      const body = await readBody(req);
      if (typeof body.profile !== "string" || typeof body.taskId !== "string" || Object.keys(body).some((key) => !["profile", "taskId"].includes(key))) return send(res, 400, { error: "expected profile and taskId" });
      return send(res, 202, await launch(body.profile, body.taskId));
    }
    if (req.method === "POST" && url.pathname === "/api/explore") {
      const body = await readBody(req);
      if (typeof body.taskId !== "string" || Object.keys(body).some((key) => key !== "taskId")) return send(res, 400, { error: "expected taskId" });
      const dataset = await json(resolve(root, "data/tasks.json"), { cases: [] });
      return send(res, 201, await exploreTask({ taskId: body.taskId, tasks: dataset.cases, runsDir }));
    }
    if (req.method === "POST" && url.pathname === "/api/programming/classify") {
      const body = await readBody(req);
      if (Object.keys(body).some((key) => key !== "prompt") || typeof body.prompt !== "string" || !body.prompt.trim() || body.prompt.length > 5000) {
        return send(res, 400, { error: "expected prompt (max 5000 chars)" });
      }
      try { return send(res, 200, await classifyProgramming(body.prompt.trim())); }
      catch (error) { return send(res, 502, { error: error.message }); }
    }
    if (req.method === "POST" && url.pathname === "/api/programming/label") {
      return send(res, 201, await saveClassifierExample(await readBody(req)));
    }
    if (req.method === "GET") {
      const rel = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
      const path = resolve(staticDir, rel);
      if (!path.startsWith(`${staticDir}${sep}`)) return send(res, 404, { error: "not found" });
      try { return send(res, 200, await readFile(path, "utf8"), mime[extname(path)] || "application/octet-stream"); }
      catch { return send(res, 404, { error: "not found" }); }
    }
    send(res, 404, { error: "not found" });
  } catch (error) { send(res, 400, { error: error.message }); }
});

server.listen(Number(process.env.PORT || 4177), "127.0.0.1", () => console.log(`Dream-SRI lab: http://127.0.0.1:${server.address().port}`));
