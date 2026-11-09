import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { replayPolicy } from "./learning.mjs";

const args = process.argv.slice(2);
if (args.length === 1 && args[0] === "--help") {
  console.log("Uso: npm run replay -- <optimization-result.json> [train|holdout]");
} else if (args.length < 1 || args.length > 2 || (args[1] && !["train", "holdout"].includes(args[1]))) {
  console.error("Uso: npm run replay -- <optimization-result.json> [train|holdout]");
  process.exitCode = 2;
} else {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const dataset = JSON.parse(await readFile(resolve(here, "../data/tasks.json"), "utf8"));
    const optimization = JSON.parse(await readFile(resolve(process.cwd(), args[0]), "utf8"));
    if (optimization.schema !== "dream-sri/optimization-v1") throw new Error("unsupported optimization result");
    const partition = args[1] ?? "holdout";
    const cases = dataset.cases.filter((item) => item.partition === partition);
    const experiences = replayPolicy(optimization.selected.policy, cases, dataset.label_kind);
    const correct = experiences.filter((item) => item.labelMatch).length;
    console.log(JSON.stringify({
      schema: "dream-sri/replay-v1",
      policyVersion: optimization.selected.policy.version,
      datasetSchema: dataset.schema,
      sourceSnapshot: dataset.source_snapshot,
      labelKind: dataset.label_kind,
      partition,
      summary: { correct, total: experiences.length, accuracy: correct / experiences.length },
      experiences,
    }, null, 2));
  } catch (error) {
    console.error(`No se pudo reproducir: ${error.message}`);
    process.exitCode = 1;
  }
}
