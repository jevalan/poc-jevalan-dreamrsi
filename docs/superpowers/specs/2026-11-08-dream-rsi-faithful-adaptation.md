# Adaptación fiel de DREAM-RSI al hub de Jevalan

**Estado:** R1–R3 implementadas parcialmente y verificadas: evaluador fijo,
exploración real Kev/Laya y pool persistente de trazas. La primera traza contiene
dos fallos de backend; no hay replay, autoría de políticas ni promoción.

## Objetivo

Reemplazar el nombre engañoso de la heurística actual por una adaptación
explícita del ciclo DREAM-RSI: exploración medida, pool de trazas inmutables,
replay de políticas y promoción basada en resultados reproducibles.

## Términos

- **Candidato de tarea:** backend/especialista que recibe la petición evaluada.
- **Exploración:** seleccionar y ejecutar un intento de candidato para una tarea.
- **Evaluador:** función fija que convierte una salida observada en recompensa
  y coste comparables. `expected_fit` solo es objetivo de comparación después
  de ejecutar un candidato y registrar su respuesta.
- **Mundo/traza:** snapshot inmutable de intentos, relaciones, outcomes y costes
  de una ejecución de exploración.
- **Política de exploración:** método reproducible que decide qué intento
  observar después usando solo el prefijo ya observado.
- **Autor de política:** agente de código separado que propone/revisa
  implementaciones de la política. No es el candidato evaluado.

## Ciclo requerido

1. Ejecutar una política baseline sobre tareas/evaluadores fijos y registrar cada
   intento, score, coste, error y relación de rama/refine.
2. Congelar cada ronda en el pool de trazas; el replay no vuelve a llamar al
   candidato ni al evaluador.
3. Reproducir baseline e incumbent/candidatas en todas las trazas con la misma
   API de entorno, midiendo logro frente a presupuesto y serialismo.
4. Permitir que un proveedor configurado proponga versiones de política; validar
   que compilan, respetan la interfaz y solo consumen observaciones reveladas.
5. Promover únicamente la candidata seleccionada por replay que haya pasado sus
   validaciones; si falla, conservar la incumbent.
6. Mostrar mundos, decisiones, rewards, errores y promoción en el dashboard.

## Contrato de evaluación para Jevalan

- Cada evaluación fija el prompt, criterios, candidatos y versionado de
  configuración.
- Se guarda entrada/salida necesaria para reproducir la decisión, sin secretos.
- El reward y coste provienen de un evaluador declarado; si no existe outcome
  medido, el run no entra al pool.
- Las métricas de catálogo y clasificación curada pueden informar al baseline,
  pero no se etiquetan como éxito de ejecución.
- Un run fallido se registra con su clase de error y recompensa definida por el
  evaluador; no se inventa un score.

## Restricciones

- Mantener el catálogo hermano como fuente externa de metadatos en solo lectura.
- No incluir credenciales en políticas, trazas, logs o UI.
- El autor de políticas usa Strata/Ornith en `127.0.0.1:18082`; no configurar
  proveedores cloud ni costes por token.
- El LLM local solo propone código de política. No selecciona candidatos,
  calcula rewards ni decide promociones.
- No alterar los repositorios de Jevalan, catálogo ni DREAM-RSI upstream.
- El código propio queda bajo `src/`, la documentación bajo `docs/`; el clone
  upstream queda local e ignorado.

## Límites conocidos

- Primera exploración (`review-holdout-01`): Kev devolvió HTTP 500 y Laya no
  respondió; ambos fallos quedaron registrados con reward 0 por el evaluador.
- Laya se inició en CPU en `127.0.0.1:8021`; en `routing-holdout-01` respondió
  HTTP 200, pero predijo `supervision` en vez de `routing` (reward 0).
- Kev sigue activo en `127.0.0.1:8009`, pero la inferencia continúa devolviendo
  HTTP 500.
- Ambos son backends de decisión, no autores de código de políticas.
- El evaluador actual puntúa elección de etiqueta `fit` y errores de backend;
  aún no mide la calidad de una capacidad Jevalan ejecutada.
- Strata respondió en loopback y reportó Ornith
  `ornith-1.5-35b-a3b-apex-i-mini` cargado con contexto 32768. Solo se consultó
  salud/inventario; no se generó texto.
- `poc-ante` ya tiene un adaptador local compatible con el protocolo upstream,
  con herramientas confinadas de lectura/escritura. Se usará como referencia
  de solo lectura, sin modificar ese repo.
- Upstream permite inyectar un agente en `run_live`, pero `discover` solo
  resuelve `gemini`, `codex` y `claude`; la POC necesita un orquestador local
  para la autoría de políticas, sin tocar el clone upstream.

## Criterios de aceptación

1. El historial muestra solo resultados realmente evaluados y con provenance.
2. Los mismos mundos producen el mismo replay para la misma política.
3. El replay no puede leer outcomes de intentos no revelados.
4. Baseline e incumbent se comparan en las mismas trazas y presupuestos.
5. La promoción exige una candidata válida y seleccionada; un error conserva la
   incumbent.
6. El dashboard distingue intento online, replay offline y resumen de política.
