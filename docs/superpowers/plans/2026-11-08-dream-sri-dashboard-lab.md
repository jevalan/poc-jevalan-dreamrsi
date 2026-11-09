# Plan: dashboard-lab para Dream-SRI

> Spec: `docs/superpowers/specs/2026-11-08-dream-sri-dashboard-lab.md`.
> Mantener todo el código y los datos bajo esta POC.

## Tareas

- [x] Identificar contratos locales: Kev `/v1/models` y `/v1/systemone` en
  `:8009`; Laya en `:8021`.
- [x] Guardar los dos diagnósticos actuales como runs inmutables con logs.
- [x] Exponer sondeo de backend, evaluación, casos y runs desde el API local.
- [x] Sustituir la vista plana por un grafo Svelte Flow con nodos para dataset,
  política, servicios y runs; selección de run abre stdout/stderr.
- [x] Mantener el servicio del dashboard en loopback y compilar la interfaz con
  Vite; `/dist/` queda fuera de Git.
- [x] Construir la UI y verificar HTTP 200 para la página, bundle, estado y logs.
- [ ] Añadir prueba de inferencia desde el canvas con registro automático de
  petición, respuesta, latencia y error.
- [ ] Conectar inicio/parada controlada de Laya/Kev; confirmar antes los
  límites de ciclo de vida y el origen local de los modelos.
- [ ] Verificar el aspecto en navegador; el host integrado no estaba disponible.

## Restricciones

- No representar el holdout curado como resultado de inferencia real.
- No aceptar URLs ni comandos arbitrarios desde el navegador.
- No descargar pesos ni cambiar procesos ajenos a esta POC sin autorización.
- No tocar los repositorios de Jevalan, el catálogo o `poc-ante`.
