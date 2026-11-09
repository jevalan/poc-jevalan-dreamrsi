const PROFILE_NAMES = new Set(["laya", "kev"]);
const SAFE_ENV_NAME = /^[A-Z_][A-Z0-9_]*$/;

export function prepareLaunch({ launchers, profileName, taskId, tasks, workspace, taskFile }) {
  if (!PROFILE_NAMES.has(profileName)) throw new Error("unknown launcher profile");
  if (!Array.isArray(tasks)) throw new TypeError("tasks must be an array");
  const task = tasks.find((item) => item.id === taskId);
  if (!task) throw new Error("unknown task id");
  const launcher = launchers?.profiles?.[profileName];
  if (!launcher || typeof launcher.command !== "string" || !launcher.command.trim()) {
    throw new Error(`${profileName} launcher is not configured`);
  }
  if (/\.(cmd|bat)$/i.test(launcher.command.trim())) {
    throw new Error("configure a native executable; .cmd/.bat wrappers need a reviewed adapter");
  }
  if (!Array.isArray(launcher.args) || launcher.args.some((arg) => typeof arg !== "string")) {
    throw new TypeError(`${profileName}.args must be a string array`);
  }
  const envAllowlist = launcher.env_allowlist ?? [];
  if (!Array.isArray(envAllowlist) || envAllowlist.some((name) => typeof name !== "string" || !SAFE_ENV_NAME.test(name))) {
    throw new TypeError(`${profileName}.env_allowlist contains an invalid name`);
  }

  const values = {
    task_id: task.id,
    prompt: task.request,
    workspace,
    task_file: taskFile,
  };
  const args = launcher.args.map((arg) => arg.replace(/\{\{(task_id|prompt|workspace|task_file)\}\}/g, (_, key) => values[key]));
  if (args.some((arg) => /\{\{.*?\}\}/.test(arg))) throw new Error("launcher args contain an unknown placeholder");
  return { command: launcher.command.trim(), args, envAllowlist, task };
}

export function isRunId(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function makeChildEnv(parentEnv, envAllowlist) {
  const names = new Set([
    "PATH", "SystemRoot", "WINDIR", "USERPROFILE", "APPDATA", "LOCALAPPDATA",
    "TEMP", "TMP", "HOME", "PATHEXT",
    ...envAllowlist,
  ]);
  return Object.fromEntries([...names].filter((name) => parentEnv[name] !== undefined).map((name) => [name, parentEnv[name]]));
}
