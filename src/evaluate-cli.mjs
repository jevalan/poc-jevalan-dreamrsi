import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluatePolicies } from "./evaluate.mjs";

const args = process.argv.slice(2);
if (args.length === 1 && args[0] === "--help") {
  console.log("Uso: npm run evaluate\nCompara baseline y política optimizada en el holdout fijo.");
} else if (args.length) {
  console.error("Uso: npm run evaluate [-- --help]");
  process.exitCode = 2;
} else {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const dataset = JSON.parse(await readFile(resolve(here, "../data/tasks.json"), "utf8"));
    const training = dataset.cases.filter((item) => item.partition === "train");
    const holdout = dataset.cases.filter((item) => item.partition === "holdout");
    const report = evaluatePolicies(training, holdout);
    console.log(JSON.stringify({
      dataset: {
        schema: dataset.schema,
        sourceSnapshot: dataset.source_snapshot,
        labelKind: dataset.label_kind,
        caseOrigin: dataset.case_origin,
      },
      ...report,
    }, null, 2));
  } catch (error) {
    console.error(`No se pudo evaluar: ${error.message}`);
    process.exitCode = 1;
  }
}
