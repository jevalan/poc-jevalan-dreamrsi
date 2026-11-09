import assert from "node:assert/strict";
import test from "node:test";
import { isRunId, makeChildEnv, prepareLaunch } from "../src/lab-core.mjs";

const tasks = [{ id: "task-1", request: "inspect the parser" }];

test("launch expands only a configured profile and known task placeholders", () => {
  const config = { profiles: { laya: { command: "node.exe", args: ["agent.js", "{{task_id}}", "{{prompt}}", "{{workspace}}"] } } };
  const launch = prepareLaunch({
    launchers: config, profileName: "laya", taskId: "task-1", tasks,
    workspace: "E:/workspaces/run", taskFile: "E:/workspaces/run/task.json",
  });
  assert.deepEqual(launch.args, ["agent.js", "task-1", "inspect the parser", "E:/workspaces/run"]);
  assert.throws(() => prepareLaunch({ launchers: config, profileName: "anything", taskId: "task-1", tasks }), /unknown launcher/);
  assert.throws(() => prepareLaunch({ launchers: config, profileName: "laya", taskId: "../task", tasks }), /unknown task/);
});

test("launcher rejects shell wrappers and exposes only allowlisted environment values", () => {
  const config = { profiles: { kev: { command: "kev.cmd", args: [] } } };
  assert.throws(() => prepareLaunch({ launchers: config, profileName: "kev", taskId: "task-1", tasks }), /native executable/);
  assert.deepEqual(makeChildEnv({ PATH: "path", API_KEY: "secret", OTHER: "hidden" }, ["API_KEY"]), {
    PATH: "path", API_KEY: "secret",
  });
});

test("run IDs are UUIDs only", () => {
  assert.equal(isRunId("550e8400-e29b-41d4-a716-446655440000"), true);
  assert.equal(isRunId("../results"), false);
});
