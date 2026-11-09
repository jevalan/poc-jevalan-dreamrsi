# Plan: Dream-SRI como hub experimental del catálogo

> Plan enlazado a `docs/superpowers/specs/2026-11-08-dream-sri-catalog-hub.md`.
> Ejecutar secuencialmente en esta POC. No tocar los repositorios vecinos.

**Objetivo:** obtener un ciclo pequeño y reproducible que consuma datos del
catálogo en modo lectura, compare una selección baseline con una política
ajustada por replay y documente una frontera viable para Jevalan.

**Arquitectura:** adaptador de lectura → modelo mínimo de candidatos/casos →
políticas puras → historial/replay → evaluación e informe. La política no
ejecuta capacidades. El catálogo y Jevalan permanecen fuera del área de
escritura.

**Restricciones globales:**

- Leer primero instrucciones y contratos de los tres repositorios.
- No instalar dependencias ni acceder a red durante las pruebas locales salvo
  que un paso de investigación lo requiera y esté acotado.
- Ninguna credencial, ruta absoluta local o salida ficticia presentada como
  evidencia real.
- Fijar semilla y ordenar empates para cualquier búsqueda determinista.
- Mantener evidencia y datos sintéticos claramente diferenciados.
- No ejecutar pruebas de Jevalan ni del catálogo como si validaran esta POC.

## Tareas

- [x] **T1 — Inspeccionar contratos y herramientas.** Confirmar estructura de
  `catalog.json` (`projects`) y `assessments.json` (`assessments`), evidencia
  `static`/`measured`, disponibilidad de Node y perfil de hub de Jevalan.
- [x] **T2 — Corregir rutas de repositorios.** Desde la raíz de esta POC, los
  repos hermanos están en `../../jev-hub-catalog` y `../../jevalan`. Verificado
  que ambos resuelven a los directorios reales y que el CLI resuelve desde
  `src/` a los dos JSON de datos del catálogo.
- [x] **T3 — Cargar catálogo en solo lectura.** Unir proyecto y evaluación por
  repo, validar referencias y conservar solo los campos que usa la decisión
  (`repo`, `decision`, `fit`, `evidence`). Comprobado contra la instantánea
  local: 123 referencias marcadas `in_catalog` resuelven a proyectos.
- [x] **T4 — Implementar decisión baseline.** Seleccionar candidatos
  `decision=yes` con coincidencia exacta de `fit`; desempate por ID de repo y
  abstención explícita. `evidence` se devuelve como procedencia y no ordena la
  selección porque no mide calidad para la petición.
- [x] **T5 — Añadir CLI JSON reproducible.** Acepta exactamente un grupo `fit`
  o `--help`; las decisiones emiten solo JSON por stdout, ayuda por stdout,
  errores/uso inválido por stderr. No ejecuta candidatos.
- [x] **T6 — Crear casos etiquetados y particiones.** Diez casos sintéticos
  con etiquetas de intención curadas, cinco `train` y cinco `holdout`,
  congelados antes de ajustar políticas. No se presentan como resultados medidos.
- [x] **T7 — Implementar historial, replay y optimizador acotado.** El ajuste
  valida que recibe solo `train`; guarda política, grilla, métricas e
  experiencias curadas en JSON. El replay permite seleccionar la partición.
- [x] **T8 — Evaluar, documentar contrato Jevalan y cerrar README.** Comparador
  de mayoría vs Naive Bayes sobre los mismos cinco casos holdout; métricas y
  límites documentados; frontera Jevalan revisada sin modificar ese repo.
- [ ] **T9 — Implementar dashboard-lab local.** Inspirarse en el laboratorio de
  poc-ante para listar/ver ejecuciones y lanzar Laya o Kev mediante entradas
  explícitamente permitidas; sus comandos deben confirmarse antes de integrar.

T3–T8 están implementadas en `src/` y documentadas. Falta la ejecución final
de los CLI y las pruebas automatizadas. T9 es el siguiente hito.

## Fase 0: inspección y decisiones de diseño

- [x] Leer README/AGENTS, `data/catalog.json`, `data/assessments.json`, el
  validador y el generador del catálogo; anotar campos, procedencia y
  estabilidad del formato.
- [x] Leer `../../jevalan/docs/hub-profile.md`, la especificación de contrato
  enlazada desde allí y el test de conformidad relevante, en modo lectura.
- [x] Revisar paper, repositorio y código de Dream-RSI; registrar con citas
  locales/URLs qué mecanismos se adoptan y qué queda fuera.
- [x] Comprobar estado y archivos existentes de la POC; decidir lenguaje y
  formatos por lo que haya realmente, sin asumir que ya existe código.
- [x] Cerrar en la spec las cuatro decisiones pendientes: fuente de datos,
  conjunto etiquetado, stack y mapeo Jevalan.

**Puerta:** no implementar un importador de catálogo ni una integración hasta
haber confirmado los esquemas y el contrato en el paso anterior.

## Fase 1: casos y modelo mínimo

- [x] Crear diez casos sintéticos cuya etiqueta `expected_fit` se justifica
  con la taxonomía del catálogo. No son observaciones ni verdad de terreno de
  éxito de herramientas.
- [x] Fijar snapshot/fechas de la fuente y guardar procedencia sin rutas
  absolutas ni duplicar los registros completos del catálogo.
- [x] Definir el formato mínimo para petición, etiqueta, partición y motivo.
- [x] Congelar el holdout en el fichero antes de entrenar: un ejemplo por
  grupo en cada partición, sin variantes del mismo caso entre ellas.

## Fase 2: baseline e historial

- [x] Implementar baseline determinista con desempate estable y abstención.
- [x] Definir resultado tipado: candidato/abstención, versión, regla de
  selección y razones usadas. Se omite una puntuación numérica porque el
  baseline no tiene una escala de calidad calibrada.
- [ ] Registrar decisión y resultado observado por separado; permitir que un
  resultado no esté disponible.
- [ ] Añadir una prueba pequeña para selección, desempate, abstención y
  serialización/relectura del historial.

## Fase 3: replay y optimizador acotado

- [x] Implementar replay puro: misma experiencia + misma política produce la
  misma predicción y métricas de etiqueta.
- [x] Evaluar una grilla fija de `alpha` para Naive Bayes sobre `train`; el
  optimizador rechaza filas que no sean de entrenamiento.
- [x] Emitir versión, configuración, métricas por candidato y experiencias
  referenciadas en el JSON de optimización.
- [x] Añadir pruebas de reproducibilidad y aislamiento del holdout (pendiente
  ejecutarlas en la pasada final acordada).

## Fase 4: comparación e informe

- [x] Ejecutar baseline y política elegida sobre el holdout con idénticos casos
  mediante `npm run evaluate`.
- [x] Informar acierto, cobertura y abstenciones; no reportar latencia/coste
  porque no se ejecutan candidatos.
- [x] Comparar contra baseline con tamaño de muestra y limitaciones visibles.
- [x] Añadir un comando reproducible que carga el dataset local y genera el
  informe JSON sin red.

## Fase 5: frontera Jevalan y cierre

- [x] Mapear el resultado de decisión al contrato Jevalan; documentar que la
  POC aún no es un proveedor consumible y qué requeriría un adaptador externo.
- [x] Documentar el límite de compatibilidad; no cambiar el contrato ni añadir
  código al repositorio Jevalan.
- [x] Completar README con comandos, reproducción, procedencia y límites.
- [x] Ejecutar `npm test`, `npm run evaluate`, `npm run optimize`, replay de
  holdout y selección `routing`; corregir el fallo del cargador y registrar el
  resultado en `docs/evaluation-results.md` y `results/`.
- [x] Revisar el alcance: no se ejecutaron candidatos ni se cambió Jevalan.

## Estructura inicial prevista

No crear todo esto de antemano: ajustar al stack y convenciones que revele la
Fase 0.

```text
docs/superpowers/specs/...
docs/superpowers/plans/...
data/                  # solo fixtures/experiencias propias, con procedencia
src/                   # importación, políticas, replay y evaluación mínimos
tests/                 # reglas puras y un flujo reproducible
README.md
```

## Enfoque de revisión

1. Filtración de etiquetas/holdout hacia la optimización.
2. Mezcla de evidencia `static`, `measured` y sintética.
3. Selección de rasgos derivados de popularidad sin justificación.
4. Entrada del catálogo tratada como invocable sin evidencia.
5. Cambio accidental fuera de la POC o inclusión de rutas/secretos locales.
6. Métricas que confunden latencia del selector con ejecución del candidato.
