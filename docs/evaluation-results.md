# Primera evaluación de políticas

**Ejecución:** 2026-11-08. **Dataset:** `dream-sri/task-dataset-v1`, cinco
casos de entrenamiento y cinco holdout, todos con prompts sintéticos y
etiquetas `curated_expected_fit`.

| Política | Aciertos holdout | Exactitud | Cobertura | Abstenciones |
| --- | ---: | ---: | ---: | ---: |
| Mayoría (`context`) | 1/5 | 20% | 100% | 0 |
| Naive Bayes (`alpha=0.25`) | 3/5 | 60% | 100% | 0 |

Delta observado: **+0,4** de exactitud sobre estos cinco casos. Naive Bayes
acertó `routing`, `review` y `context`; falló `gates` y `supervision`. La
búsqueda obtuvo 5/5 en entrenamiento para los cuatro valores de `alpha`; el
desempate determinista eligió el menor (`0.25`). Ese ajuste perfecto en solo
cinco filas deja claro el riesgo de memorización.

Esto **no demuestra una mejora generalizable**: el holdout tiene un ejemplo por
grupo y las etiquetas expresan la intención redactada por quien curó los
prompts. No se eligió ni ejecutó ningún especialista; no hay medidas de éxito
de herramientas, latencia o coste. El resultado solo verifica el pipeline de
clasificación y replay.

Artefactos JSON reproducibles de esa ejecución:

- [`results/evaluation-2026-11-08.json`](../results/evaluation-2026-11-08.json)
- [`results/optimization-2026-11-08.json`](../results/optimization-2026-11-08.json)
- [`results/replay-holdout-2026-11-08.json`](../results/replay-holdout-2026-11-08.json)
- [`results/decision-routing-2026-11-08.json`](../results/decision-routing-2026-11-08.json)

El selector de catálogo se verificó además con `routing`: seleccionó
`BillionsBobby/JevRouter` por `fit` y orden estable. Eso confirma el recorrido
del catálogo, no que JevRouter sea el mejor especialista para una tarea real.
