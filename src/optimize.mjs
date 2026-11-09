import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { optimizePolicy } from "./learning.mjs";

const args = process.argv.slice(2);
if (args.length === 1 && args[0] === "--help") {
  console.log("Uso: npm run optimize\nOptimiza solo con los casos train de data/tasks.json.");
} else if (args.length) {
  console.error("Uso: npm run optimize [-- --help]");
  process.exitCode = 2;
} else {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const dataset = JSON.parse(await readFile(resolve(here, "../data/tasks.json"), "utf8"));
    const training = dataset.cases.filter((item) => item.partition === "train");
    const result = optimizePolicy(training);
    console.log(JSON.stringify({
      dataset: {
        schema: dataset.schema,
        sourceSnapshot: dataset.source_snapshot,
        labelKind: dataset.label_kind,
      },
      ...result,
    }, null, 2));
  } catch (error) {
    console.error(`No se pudo optimizar: ${error.message}`);
    process.exitCode = 1;
  }
}
