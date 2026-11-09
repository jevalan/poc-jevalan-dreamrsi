# Jevalan Dream-SRI POC

An experimental, local-first hub that reads the Jev capability catalog and
explores how prior experience could help select a capability for a request.
This repository is a proof of concept, not a production Jevalan integration or
a faithful reimplementation of Dream-RSI.

## Current status

- The catalog decision CLI, baseline, optimizer, replay, and evaluation
  artifacts are available. The small curated dataset is a smoke test and does
  not demonstrate generalization.
- The Svelte Flow dashboard displays the experiment and includes a local
  programming-task classifier. Enter a prompt, ask Laya to classify it as
  `programming` or `other`, then confirm or correct the label.
- Only human-labeled classifier examples are saved, locally, to
  `runs/programming-classifier.jsonl`. The dashboard reports Laya's agreement
  with those labels. This is an evaluation dataset; the model is not retrained.
- Kev is parked while its backend is being investigated. The dashboard does
  not poll Kev, and the joint exploration action is disabled.

## Repository layout

```text
src/       POC source code and dashboard
docs/      Design, research notes, dataset, and plans
data/      Small, versioned POC fixtures
results/   Reproducible decision, optimization, replay, and evaluation output
tests/     Automated tests for the POC logic
```

Local runs, prompts, launcher configuration, workspaces, build output, and the
Dream-RSI reference checkout are excluded by `.gitignore`.

## Requirements and commands

Requires Node.js 20 or later. Install the declared development dependencies
with `npm install`.

```powershell
npm run decide -- routing
npm run optimize
npm run replay -- runs\optimization.json holdout
npm run evaluate
npm test
npm run prelab
npm run lab
```

The catalog commands read `../../jev-hub-catalog/data/catalog.json` and
`../../jev-hub-catalog/data/assessments.json` in read-only mode. The `routing`
argument can be replaced with a `fit` group present in the catalog evaluation
data. See [dataset notes](docs/dataset.md) for provenance and evaluation
limits.

## Dashboard lab

Run `npm run lab`, then open <http://127.0.0.1:4177>. The Svelte Flow canvas
shows the dataset, evaluation, local Laya backend, parked Kev node, and saved
runs. Select a node to inspect it; select a run to view its stdout and stderr.

The programming classifier calls only the local Laya endpoint at
`127.0.0.1:8021/v1/systemone`. Laya must already be running. Prompts are sent
to that local service and are not saved unless you confirm or correct the
prediction. Labeled prompts stay under the Git-ignored `runs/` directory and
are not included in commits.

The existing baseline exploration against Kev and Laya remains paused while
Kev is parked. The classifier does not call Kev or a paid API. Strata/Ornith
remains a possible future local policy author; it does not select, optimize,
evaluate, or promote policies in this POC.

## Boundaries

- `jev-hub-catalog` remains the source of truth for projects, decisions, and
  evidence. This POC reads its artifacts and does not modify the catalog.
- Jevalan is a possible future consumer; this POC does not modify its code or
  provide an SDK.
- Recommendations do not execute catalog capabilities automatically.
- Synthetic fixtures, curated labels, and real measurements are kept distinct.
- Dream-RSI is an inspiration for this experiment; this POC does not claim to
  reproduce its system or published results.

## Design documents

- [Catalog hub specification](docs/superpowers/specs/2026-11-08-dream-sri-catalog-hub.md)
- [Catalog hub plan](docs/superpowers/plans/2026-11-08-dream-sri-catalog-hub.md)
- [Dashboard lab specification](docs/superpowers/specs/2026-11-08-dream-sri-dashboard-lab.md)
- [Dashboard lab plan](docs/superpowers/plans/2026-11-08-dream-sri-dashboard-lab.md)
- [Dream-RSI adaptation specification](docs/superpowers/specs/2026-11-08-dream-rsi-faithful-adaptation.md)
- [Working prompt](docs/prompt.md)
- [Dataset notes](docs/dataset.md)
- [Jevalan compatibility notes](docs/jevalan-compatibility.md)
- [Evaluation results](docs/evaluation-results.md)
