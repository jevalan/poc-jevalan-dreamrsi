# Prompt de trabajo: Dream-SRI como hub experimental del catálogo Jev

Actúa como ingeniero senior especializado en Rust, sistemas de decisión,
evaluación reproducible y arquitecturas JEV.

## Contexto y objetivo

Jevalan es un hub local de decisiones en Rust. En el mismo directorio de
trabajo están:

- `../../jev-hub-catalog`: catálogo y evaluación de proyectos/capacidades del
  ecosistema Jev.
- `../../jevalan`: implementación del hub Jevalan.
- Este repositorio: POC independiente `poc-jevalan-dreamsri`.

Quiero explorar una aproximación inspirada en Dream-RSI que aprenda de
experiencias previas para elegir qué capacidad o especialista del catálogo
conviene para una petición. La POC debe servir como **hub experimental del
catálogo** y preparar una posible forma de consumo por Jevalan.

La dirección de dependencias debe ser:

```text
jev-hub-catalog (fuente de catálogo y evidencia)
             ↓ consumo de artefactos/contrato publicado
Dream-SRI POC (selección experimental, historial y políticas)
             ↓ contrato de decisión validado
Jevalan (posible consumidor futuro)
```

El catálogo conserva la verdad sobre proyectos, adaptabilidad, veredictos y
mediciones. Dream-SRI no lo reemplaza, no escribe en él y no convierte el
catálogo en registro de instalación o distribución. La POC puede mantener sus
propias trazas y resultados experimentales.

## Reglas de trabajo

1. Inspecciona primero este repositorio, `../../jev-hub-catalog` y las partes
   pertinentes de `../../jevalan`, junto con sus `AGENTS.md` y documentación.
2. No asumas que Dream-RSI tiene una implementación completa reutilizable.
   Examina su publicación y repositorio; distingue los mecanismos publicados
   de lo que implementemos como aproximación.
3. No modifiques `../../jev-hub-catalog` ni `../../jevalan` sin autorización explícita.
   Todo cambio de esta tarea queda en la POC.
4. No incorpores dependencias de Dream-RSI a Jevalan, no desarrolles un SDK y
   no uses un LLM para seleccionar, entrenar o evaluar políticas.
5. No inventes resultados ni afirmes mejora sin evaluación con datos y tareas
   identificados. Separa evidencia del catálogo, resultados medidos por esta
   POC y datos sintéticos.
6. Trabaja incrementalmente: concreta una POC mínima ejecutable, ejecuta las
   comprobaciones pertinentes y comunica límites y bloqueos reales.

## Fase 1: contratos y fuentes

- Resume cómo `jev-hub-catalog` representa proyectos, forma de integración
  (`flow`/`exec`/`http`/`n_a`), coste, evaluaciones y evidencia.
- Identifica qué artefacto genera el catálogo y cuál es el contrato publicado
  que Jevalan consume. Comprueba las rutas reales; no inventes un API.
- Inspecciona el perfil del hub y la suite de conformidad de Jevalan para
  determinar qué podría consumir Jevalan sin cambiar su núcleo.
- Revisa Dream-RSI y documenta qué ideas son verificables y cuáles son
  hipótesis de esta POC.
- Si no existe un formato estable del catálogo adecuado para consumo, propone
  primero un adaptador de lectura local dentro de la POC; no cambies el
  catálogo para acomodarla.

## Fase 2: selección y experiencias

Construye un conjunto pequeño y trazable de tareas de selección relacionadas
con capacidades del catálogo. Cada caso debe indicar petición, capacidades
candidatas, evidencia disponible, decisión esperada y criterio de evaluación.
Etiqueta claramente cualquier fixture sintético.

Registra para cada decisión: versión de política, candidatos considerados,
selección, motivo/rasgos usados, resultado observado, latencia, intentos y
coste cuando esos datos existan. No confundas el coste medido de un proyecto
con el coste de ejecutar esta POC.

## Fase 3: baseline y optimización

- Implementa una política determinista sencilla como baseline.
- Implementa un optimizador independiente, sin LLM, inspirado solo en
  mecanismos respaldados por la investigación. Empieza con el método más
  pequeño que permita comparar políticas (por ejemplo, ajuste de pesos o
  umbrales sobre experiencias registradas).
- Versiona las políticas y guarda configuración, semilla si aplica y métricas.
- Evita fuga de información: separa experiencias de ajuste de tareas de
  evaluación y compara ambas políticas en los mismos casos.

## Fase 4: evaluación e integración futura

Compara baseline y política optimizada con los mismos casos y criterios:
calidad de selección, tasa de éxito cuando se pueda medir, latencia y coste
con su procedencia. Informa tamaño de muestra y limitaciones; no declares que
la política generaliza a tareas nuevas si no se probó en tareas retenidas.

Define un contrato mínimo de decisión que la POC pueda exponer y que Jevalan
podría consumir. La POC decide; la ejecución efectiva de herramientas sigue
en el cliente o banco de pruebas. Contrasta el contrato con el existente de
Jevalan y documenta incompatibilidades antes de proponer cambios. No
implementes un adaptador dentro de Jevalan en esta etapa.

## Entregables de esta POC

Empieza por los entregables mínimos necesarios para demostrar el flujo:

- README con arquitectura, límites y comandos reproducibles.
- Consumo de solo lectura del artefacto real del catálogo, si es viable; de lo
  contrario, fixture etiquetado y explicación del bloqueo.
- Baseline, optimizador experimental e historial reproducible.
- Casos de evaluación con procedencia clara.
- Informe que compare resultados sin atribuir al algoritmo lo que no midió.
- Pruebas automatizadas proporcionales a la lógica añadida.

No construyas de entrada una plataforma genérica, servicio permanente,
registro, SDK, interfaz gráfica ni integración en el núcleo de Jevalan. Añade
solo lo que haga falta para probar selección y consumo del catálogo.

## Criterio de éxito

La POC permite leer o representar fielmente datos del catálogo, producir una
decisión tipada con una política baseline y otra optimizada, reproducir la
comparación y dejar definido un contrato evaluable para un posible consumidor
Jevalan. Una mejora solo se considera demostrada si aparece en evaluación
controlada con casos retenidos y evidencia real.

Empieza inspeccionando los repositorios y reporta brevemente el contrato
encontrado y la estructura mínima propuesta. Después continúa con la primera
implementación ejecutable dentro de esta POC.
