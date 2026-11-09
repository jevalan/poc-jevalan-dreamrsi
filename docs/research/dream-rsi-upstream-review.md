# Revisión de la implementación oficial DREAM-RSI

Fecha de inspección: 2026-11-08.

## Fuente revisada

- Repositorio: <https://github.com/google-research/dream-rsi>
- Commit clonado: `8ec35bd2538220517ce1bfca4282db21b8c518db` (2026-10-08).
- Paper v2: <https://arxiv.org/abs/2609.14858> (revisado el 2026-10-06).
- Copia local de referencia: `references/dream-rsi/`, excluida de Git para no
  mezclar código upstream con el código de la POC.

No instalé dependencias, no lancé los scripts del paper y no invoqué agentes ni
servicios de pago.

## Qué implementa DREAM-RSI

El ciclo es:

1. **Exploración online.** Una política decide qué celdas explorar: cada celda
   es un intento dentro de una rama. Un agente fijo genera el intento y un
   evaluador fijo mide el resultado. La estructura y los resultados forman una
   traza de mundo (`raw_scores.json`). El baseline de política es
   `ParallelRefineMethod`.
2. **Pool de mundos.** Cada ciclo completado se congela y se añade a
   `trace_pool/`. Las trazas guardan ramas, intentos, relaciones padre/hijo,
   puntuaciones, estado de evaluación y errores.
3. **Aprendizaje offline.** Un agente de código propone y revisa implementaciones
   de `OptimalPolicy`. Cada política se reproduce con `TraceEnv` en los mismos
   mundos; el replay no vuelve a ejecutar el agente de tarea.
4. **Evaluación y promoción.** Se compara la política incumbent y las propuestas
   sobre el pool de trazas y distintas preferencias de presupuesto `beta`.
   `heuristic_search/eval.py` ordena por `pareto.reward`, basado en la curva de
   presupuesto frente a logros y una penalización por serialismo. Solo se
   promueve un método seleccionado cuya evaluación terminó correctamente.
5. **Siguiente ciclo.** La política promovida guía una exploración nueva; sus
   resultados vuelven al pool y amplían el replay.

La interfaz central es `LLMDesignedMethod.solve(SearchEnv)`. `TraceEnv` ofrece
la misma superficie para exploración live y replay; sus observaciones revelan
resultados solo después de seleccionar una celda. La implementación separa
política, explorador/agente de tarea, evaluador, traza inmutable y agente que
propone políticas.

## Qué no es DREAM-RSI

- No es Naive Bayes ni una clasificación supervisada sobre etiquetas de texto.
- No aprende `alpha` mediante una cuadrícula de hiperparámetros.
- El replay no convierte etiquetas esperadas en resultados medidos.
- El agente que explora una tarea y el agente de código que escribe políticas
  cumplen papeles diferentes.

## Diferencia con la POC actual

La POC consume `catalog.json` y `assessments.json`, clasifica prompts sintéticos
con baseline y Naive Bayes, y compara cinco etiquetas curatoriales de holdout.
No tiene respuestas ejecutadas de candidatos, trazas de intentos ni un agente
que descubra/revise políticas. Sus archivos de replay no son mundos DREAM-RSI.
Las etiquetas `expected_fit` podrían ser el objetivo de un evaluador: el reward
sería la comparación de una respuesta real del candidato con esa etiqueta. La
etiqueta sola no es un resultado ni un reward.

En Jevalan, Laya y Kev son backends de decisión `System One`; no escriben ni
ejecutan programas como los agentes de exploración que usa el código oficial.
Además, las comprobaciones locales muestran Kev con HTTP 500 al inferir. Laya
ya pudo iniciarse en CPU tras cargar su snapshot local y respondió a una tarea,
pero se equivocó de etiqueta. Hay observaciones reales en el pool, aunque todavía
no resultados útiles para comparar políticas.

## Adaptación propuesta

- Mantener el catálogo como inventario/contexto de candidatos.
- Definir un entorno de evaluación fijo: una tarea y un conjunto de candidatos
  (por ejemplo, Kev/Laya), una medida de éxito comparable y un coste por intento.
  Los prompts actuales podrían servir de smoke suite cuando haya respuestas
  reales; cinco filas holdout no prueban generalización.
- Registrar cada llamada y resultado como una celda medida; calcular reward
  comparando una respuesta real con `expected_fit`, no usar la etiqueta sola.
- Conservar la política baseline como referencia y crear un contrato de política
  reproducible que el replay pueda ejecutar sin volver a llamar a los modelos.
- Implementar el loop de pool, replay por presupuesto y promoción antes de
  añadir guías visuales o más heurísticas.
- Mantener el proveedor de autoría de políticas intercambiable. Gemini, Claude
  y Codex están soportados por upstream; Laya/Kev no cumplen ese rol. No llamar
  a un proveedor externo sin autorización explícita.

La propuesta conserva la mecánica central del paper, pero el entorno de
Jevalan y sus recompensas deben definirse y medirse por separado. No se deben
presentar resultados del catálogo o del dataset sintético como una reproducción
del benchmark publicado.

## Fuentes de código relevantes

- `dream_rsi/orchestrate.py`: ciclo online, learning, promoción y reanudación.
- `dream_rsi/env/trace_env.py`, `env/trace/types.py` y `env/trace/raw.py`:
  entorno live/replay y serialización de resultados observados.
- `dream_rsi/learning/trace_pool.py`: archivado de mundos reproducibles.
- `dream_rsi/learning/discover.py` y
  `learning/heuristic_search/workflow.py`: autoría, evaluación y selección de
  políticas candidatas.
- `dream_rsi/learning/heuristic_search/eval.py`: replay del pool, sweep de beta
  y objetivo de selección.
- `dream_rsi/policy/api.py`, `policy/baseline.py` y
  `policy/discovered/method.template.py`: interfaz y método baseline.
