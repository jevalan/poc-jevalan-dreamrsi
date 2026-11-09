import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decideBaseline } from "./baseline.mjs";
import { loadCatalog } from "./catalog.mjs";

const usage = "Uso: npm run decide -- <grupo-fit>";
const args = process.argv.slice(2);

if (args.length === 1 && args[0] === "--help") {
  console.log(`${usage}\nLee el catálogo hermano y emite una decisión JSON.`);
} else if (args.length !== 1 || !args[0].trim()) {
  console.error(usage);
  process.exitCode = 2;
} else {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const catalog = await loadCatalog(
      resolve(here, "../../../jev-hub-catalog/data/catalog.json"),
      resolve(here, "../../../jev-hub-catalog/data/assessments.json"),
    );
    const result = {
      catalog: {
        source: catalog.source,
        catalogUpdated: catalog.catalogUpdated,
        assessmentsUpdated: catalog.assessmentsUpdated,
      },
      decision: decideBaseline({ fit: args[0], candidates: catalog.candidates }),
    };
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`No se pudo emitir la decisión: ${error.message}`);
    process.exitCode = 1;
  }
}
