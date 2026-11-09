# Plan: adaptación fiel de DREAM-RSI

> Spec: `docs/superpowers/specs/2026-11-08-dream-rsi-faithful-adaptation.md`.
> Upstream analizado: commit `8ec35bd2538220517ce1bfca4282db21b8c518db`.

## Tareas

- [x] **R1 — Inspeccionar upstream.** Ciclo, entornos live/replay, trazas, pool,
  evaluación, promoción, dependencias y roles de agentes documentados en
  `docs/research/dream-rsi-upstream-review.md`.
- [x] **R2 — Definir tarea y reward Jevalan.** Empezar con los prompts y
  `expected_fit` actuales; evaluar la salida real de un candidato frente a la
  etiqueta mediante una función fija.
- [x] **R3 — Crear recorder de exploración.** Escribir trazas inmutables solo a
  partir de runs evaluados y con versión de configuración.
- [ ] **R4 — Implementar entorno y baseline replayables.** Política consulta solo
  observaciones reveladas; baseline sigue siendo referencia explícita.
- [ ] **R5 — Implementar evaluación offline.** Reproducir políticas sobre el
  mismo pool y presupuesto; calcular reward y penalización de serialismo.
- [ ] **R6 — Conectar autor local de políticas.** Adaptar el agente local de
  `poc-ante` a Strata/Ornith (`127.0.0.1:18082`) e inyectarlo desde un
  orquestador de la POC, porque el `discover` upstream solo resuelve Gemini,
  Codex y Claude. Sin proveedor cloud; lectura/escritura confinadas y validación
  aislada de la política.
- [ ] **R7 — Gate de promoción y ciclos.** Promover solo seleccionadas válidas;
  soportar reanudación y preservar incumbent ante fallos.
- [ ] **R8 — Integrar dashboard.** Nodos para Strata/Ornith, mundos, intentos,
  replay, evaluación, fallos y promociones.
- [ ] **R9 — Ejecutar una evaluación real.** Solo cuando haya un evaluador con
  reward medible y candidatos funcionales.

## Reglas

- No convertir una etiqueta curatorial directamente en reward: debe existir una
  respuesta ejecutada y una función de evaluación explícita.
- No activar llamadas cloud o descargas sin autorización.
- No ejecutar cambios dentro del clone upstream.
- Cada hito conserva el comportamiento actual hasta que la sustitución tenga
  resultados verificables.
