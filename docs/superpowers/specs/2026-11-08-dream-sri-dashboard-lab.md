# Dashboard-lab Dream-SRI con Svelte Flow

**Estado:** primera vista de flujo implementada. Iniciar servicios e inferencias
desde el canvas queda pendiente.

## Propósito

Ver el recorrido del catálogo y la evaluación, el estado de los backends locales
Kev/Laya y sus comprobaciones como nodos conectados. Seleccionar un nodo permite
inspeccionar sus datos; seleccionar un run permite leer sus logs.

## Canvas inicial

- Nodo de dataset/catálogo con número y procedencia de casos.
- Nodo de evaluación baseline/política que mantiene explícito el holdout curado.
- Nodos de backend para Kev y Laya con estado del endpoint, modelo y dispositivo
  cuando el servicio los expone.
- Un nodo por run reciente, conectado al backend correspondiente; su inspector
  muestra stdout y stderr.
- Sondeo cada cuatro segundos de `127.0.0.1:8009/v1/models` y
  `127.0.0.1:8021/openapi.json`.
- Canvas navegable con pan/zoom y nodos movibles, sin permitir editar el grafo.

## Arquitectura y seguridad

- UI Svelte + Svelte Flow compilada por Vite desde `src/lab-ui/` a `dist/lab/`.
- API y servidor Node estándar en `127.0.0.1:4177`; valida `Host` y sirve los
  artefactos compilados locales.
- El navegador solo consulta el servidor local. El backend sondea endpoints
  fijos de loopback; no acepta URLs arbitrarias desde el cliente.
- Logs tratados como texto y no como HTML.
- La UI distingue evaluación de clasificación de ejecución/inferencia real.
- No instala, para ni reanuda servicios de Laya/Kev; esa operación aún no está
  conectada al canvas.

## Estado observado

- Kev-0.8B levanta API en `:8009`, pero la prueba de `/v1/systemone` devolvió
  HTTP 500 en el camino Triton/FLA.
- Laya levanta en CPU en `127.0.0.1:8021` tras cargar el snapshot
  `convaiinnovations/laya`; respondió HTTP 200, pero clasificó mal la tarea
  probada (`supervision` en vez de `routing`).
- Ambos diagnósticos quedan guardados bajo `runs/<uuid>/` para inspección.
- Los resultados de evaluación usan etiquetas curadas, cinco casos holdout y no
  son medidas de éxito de los backends.

## Pendiente

1. Añadir una acción explícita de prueba de inferencia por backend que cree el
   manifiesto/run y capture respuesta, duración y error.
2. Añadir acciones de inicio si se establece un contrato local por servicio y
   se puede asegurar su ciclo de vida y límites.
3. Revisar visualmente el canvas en navegador y ajustar escala/layout si hace
   falta.
