# Dream-SRI como hub experimental del catálogo

**Estado:** propuesta de diseño para revisión antes de implementar el flujo completo.

## 1. Propósito

Esta POC explora si una política de decisión puede elegir capacidades o
especialistas relevantes para una petición usando el catálogo externo y
experiencias registradas. Su resultado debe ser reproducible y dejar una
frontera de integración evaluable por Jevalan.

No es una implementación oficial de Dream-RSI ni una extensión del núcleo de
Jevalan. Separa el trabajo en dos bucles:

1. **Selección del catálogo:** para una petición y un conjunto de candidatos,
   elegir una capacidad y registrar la decisión.
2. **Mejora de la política:** comparar versiones de la política reproduciéndolas
   sobre las mismas experiencias archivadas y promover una versión solo si
   mejora el objetivo definido.

El segundo bucle toma inspiración de Dream-RSI, cuyo método conserva mundos de
exploración y evalúa políticas mediante replay antes de volver a explorarlas.
Esta POC restringe el problema a selección de capacidades y políticas
deterministas; no reproduce el agente escritor de políticas del artículo.

## 2. Dirección de dependencias y propiedad de datos

```text
jev-hub-catalog ──publica datos/evidencia──▶ esta POC ──decisión tipada──▶ Jevalan
```

- `jev-hub-catalog` sigue siendo la fuente de verdad sobre proyectos,
  clasificación, adaptabilidad, veredictos, mediciones y evidencia.
- La POC consume datos en modo lectura. Sus decisiones, experiencias,
  políticas y resultados viven en sus propios ficheros.
- Jevalan no depende de Dream-RSI ni de esta POC durante la primera fase.
- No se modifica ninguno de los dos repositorios vecinos.
- El catálogo no se convierte en registro de capacidades desplegables; la POC
  recomienda y explica, pero no instala ni ejecuta especialistas.

## 3. Usuarios y flujo principal

El usuario de laboratorio prepara una petición y candidatos tomados del
catálogo. La POC:

1. carga una instantánea identificada del catálogo y su evidencia disponible;
2. valida/normaliza solo los campos que necesita, conservando su procedencia;
3. obtiene una selección baseline y una selección de la política candidata;
4. registra entradas, puntuaciones, decisión y versión de política;
5. evalúa ambas políticas sobre el mismo conjunto retenido;
6. genera un informe con métricas y limitaciones.

La selección es tipada: como mínimo contiene el identificador del candidato,
la versión de política y las razones/rasgos que determinaron el resultado.
La ejecución real queda fuera de la POC y pertenece al consumidor o a un
banco de pruebas explícito.

## 4. Fuentes y contrato de entrada

El catálogo mantiene `data/*.json` como fuente de verdad y genera README y
páginas a partir de esos datos. Para esta POC local se consumen en solo lectura
`data/catalog.json` y `data/assessments.json` desde `../../jev-hub-catalog`
(relativo a la raíz de esta POC). Esos JSON son los datos de trabajo del
repositorio, no un endpoint o contrato de distribución para Jevalan. Una
integración futura deberá acordar una fuente/versionado consumible; no asumir
que el path local equivale a un API.

`catalog.json` contiene `updated`, `source`, categorías y `projects` con
metadatos de repositorio. `assessments.json` contiene otra fecha y entradas de
evaluación indexadas por `repo`, con `decision`, `fit`, `form`, `callable`,
`cost`, `evidence`, `verdict` y, cuando corresponde, `run`. El validador del
catálogo exige valores de esquema conocidos, coherencia con el catálogo y un
`run` existente para cada evaluación `measured`. `fit` describe el área
funcional; `evidence` describe la profundidad de evaluación; ninguno es por sí
solo una puntuación de calidad para una petición concreta.

El adaptador de la POC debe ser de solo lectura y aceptar únicamente el
formato efectivamente verificado. Guardará suficiente procedencia para
identificar la instantánea y distinguir evidencia `static` de `measured`.
No inferirá que `stars` significa calidad ni que una capacidad se puede
ejecutar por estar catalogada. Si el formato no es un artefacto público/estable,
se usará un fixture explícito para el primer ciclo y se documentará la brecha;
no se cambiará el catálogo en esta fase.

## 5. Política y replay

### Baseline

Política determinista, pequeña y versionada. Solo usa rasgos observables en la
petición y los candidatos. Debe definir desempate estable y devolver una
decisión incluso cuando no haya candidato apropiado (abstención tipada).

### Política experimental

Primera aproximación: clasificador Naive Bayes multinomial sobre tokens, con
una grilla determinista y acotada de suavizado `alpha`. El optimizador evalúa
configuraciones mediante replay de experiencias de entrenamiento y rechaza
particiones distintas de `train`; no altera el catálogo ni modifica código
fuente de forma autónoma. La métrica actual es exactitud sobre las mismas
etiquetas de entrenamiento, por lo que puede sobreajustar.

Cada experiencia conserva petición/caso, candidatos disponibles, versión y
entrada de política, decisión, etiqueta o resultado observado y procedencia.
Para evaluar una política que elige un candidato distinto al elegido en una
experiencia anterior, hace falta resultado observado para ese candidato o una
ejecución/evaluación real; no se inventa su resultado contrafactual. Las
evaluaciones de coste y latencia solo se incluyen cuando se midan; no se
fabrican ni se mezclan con latencia del selector.

## 6. Evaluación

- Separar por caso (no por filas derivadas del mismo caso) entrenamiento y
  evaluación retenida antes de ajustar parámetros.
- El dataset inicial de diez peticiones usa `expected_fit` curado manualmente
  sobre prompts sintéticos. Mide clasificación de intención cuando se use como
  etiqueta, no acierto de especialista, éxito de ejecución ni mejora real.
- Comparar baseline y política optimizada en exactamente los mismos casos.
- Métrica primaria inicial: acierto de selección respecto a la etiqueta
  justificada del caso. Informar abstenciones y casos sin verdad de terreno.
- Informar cobertura y, si hay ejecuciones reales, éxito, latencia y coste por
  separado con su origen y unidades.
- No declarar generalización por mejorar sobre el conjunto de replay usado
  para optimizar.
- La evidencia del catálogo no equivale a una prueba de la política.

## 7. Frontera futura con Jevalan

Jevalan consume capacidades tipadas mediante proveedores `flow`, `exec` o
`http`; cada capacidad declara esquemas JSON, y su respuesta sigue el envelope
`jev-hub/0.1` (`status`, `decision`, `provider`, `request_id`). La conformidad
exige que `abstain` y `error` no lleven `decision`. El resultado de esta POC,
que recomienda un ID de candidato del catálogo, no corresponde directamente a
la decisión de dominio `tool.risk` ni está demostrado todavía como una
capacidad existente. Podría estudiarse como un proveedor externo configurado
con su propio esquema de entrada/salida, sujeto a pruebas de conformidad; no se
ha validado ese despliegue ni requiere asumir un cambio al núcleo. No se
implementa un SDK ni cambios en Jevalan en este diseño.

La POC devuelve una recomendación; el cliente decide si ejecuta. No pasa
secretos, rutas locales ni comandos arbitrarios como parte de la decisión.

## 8. No objetivos

- Reimplementar el catálogo, publicar cambios allí o mantener una copia mutable.
- Reproducir el sistema completo de agentes/LLM de Dream-RSI.
- Llamar a un LLM para selección, optimización o evaluación.
- Instalar, ejecutar o desplegar candidatos automáticamente.
- Modificar Jevalan, sus capacidades, perfil, digests o pruebas de conformidad.
- Construir un servicio permanente, SDK, interfaz gráfica o plataforma genérica.
- Afirmar que una política aprendió una mejora sin evaluación retenida.

## 9. Criterios de aceptación

1. Se documentan con rutas y ejemplos los campos reales del catálogo utilizados
   y la fuente de cada campo.
2. La POC produce una selección tipada y estable con el baseline, incluyendo
   abstención y desempate determinista.
3. Las experiencias y versiones de política se pueden guardar y reproducir.
4. El optimizador selecciona una política usando solo el conjunto de
   entrenamiento; la evaluación retenida no participa en el ajuste.
5. El informe compara ambos métodos sobre los mismos casos e indica tamaño,
   procedencia, métricas y limitaciones.
6. Existe un mapeo documentado (o incompatibilidad concreta) respecto del
   contrato de Jevalan, sin modificar ese repositorio.
7. Las pruebas cubren reglas de selección, replay y separación de conjuntos.

## 10. Decisiones para fases siguientes

- Qué conjunto concreto de tareas tiene etiquetas de selección defendibles y
  permite un holdout sin variantes duplicadas.
- Qué resultados reales existen por candidato y cómo se obtendrán los
  contrafactuales que el replay necesita para comparar políticas.
- Cómo versionar/publicar una entrada de catálogo para consumidores fuera del
  checkout local; esta POC solo lee el snapshot hermano.
- Si se prepara un proveedor externo para Jevalan y cómo validarlo con la
  suite de conformidad sin cambiar el núcleo.

## 11. Resultado de T1: inspección de fuentes y decisiones

Inspección completada el 2026-11-08. En la instantánea local revisada,
`catalog.json` tenía 1351 proyectos; `assessments.json`, 125 evaluaciones (123
marcadas dentro del catálogo), 20 `measured` y 105 `static`. Son cifras de
esa copia, no garantías de actualidad. El catálogo tiene 0 dependencias npm y
requiere Node 20 o posterior.

### Dream-RSI: publicado, implementación y límite de la adaptación

El paper describe un ciclo de rollout online con agente y evaluador fijos, que
produce árboles de intentos, seguido de una fase offline que evalúa políticas
sobre trazas archivadas. La implementación oficial mantiene una pool de
trazas, reproduce cada política en esas trazas y usa una búsqueda guiada por
agente para proponer/revisar código de política; el baseline oficial es una
política de exploración `parallel_refine`. Por tanto, la propuesta de
“optimización sin LLM” de esta POC toma el replay y la comparación sobre
historial como inspiración, pero sustituye el generador de políticas por una
búsqueda determinista acotada. Es una aproximación diferente, no una
reproducción del algoritmo publicado ni de sus resultados.

Fuentes primarias:

- [Paper en arXiv, v2](https://arxiv.org/abs/2609.14858)
- [README de la implementación oficial](https://github.com/google-research/dream-rsi)
- [Pool de trazas](https://github.com/google-research/dream-rsi/blob/main/dream_rsi/learning/trace_pool.py)
- [Evaluación por replay](https://github.com/google-research/dream-rsi/blob/main/dream_rsi/learning/heuristic_search/eval.py)
- [Descubrimiento de política mediante agente](https://github.com/google-research/dream-rsi/blob/main/dream_rsi/learning/discover.py)
- [Baseline oficial](https://github.com/google-research/dream-rsi/blob/main/dream_rsi/policy/baseline.py)

### Decisiones de esta POC

1. **Entrada inicial:** leer `catalog.json` y `assessments.json` desde la ruta
   hermana local, validando la unión por `repo`. No presentarlos como API de
   Jevalan ni cambiar el catálogo para publicar otro formato.
2. **Stack inicial:** Node.js ≥ 20 y librería estándar para consumir directamente
   los JSON de su pipeline, sin introducir dependencias. No limita la
   implementación final si la frontera con Jevalan demuestra que conviene otra.
3. **Evaluación:** particionar por tarea antes del ajuste. Solo evaluar
   candidatos alternativos cuando exista etiqueta justificable o resultado
   real; las métricas de catálogo `static`/`measured` no sustituyen esa verdad
   de terreno.
4. **Jevalan:** el contrato tipado admite decisión JSON de un proveedor, pero
   aún no hay evidencia de que Jevalan deba consumir directamente el archivo
   del catálogo o de que la selección constituya una capacidad compatible sin
   un manifiesto/configuración de proveedor. Mantenerlo como integración
   externa potencial y validar con conformidad en una fase posterior.
5. **Baseline:** el código inicial acepta un grupo `fit` explícito; por ahora
   no interpreta texto libre de petición. Solo considera `decision=yes`, exige
   coincidencia exacta de `fit` y desempata por ID ascendente de repo. La
   etiqueta `evidence` acompaña al resultado como procedencia, pero no afecta
   al ranking porque no expresa calidad para la petición.
