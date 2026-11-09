# Compatibilidad con Jevalan

## Contrato que existe

El perfil actual usa el envelope `jev-hub/0.1`: la petición identifica
capacidad, versión e `input`; la respuesta contiene `status`, `provider`,
`request_id` y, solo con estado `ok`, un `decision` tipado por el JSON Schema
de esa capacidad. Jevalan configura el proveedor como `flow`, `exec` o `http`.
Las respuestas `abstain` y `error` no llevan `decision`.

Referencias del checkout hermano: `../../jevalan/docs/hub-profile.md`,
`../../jevalan/config/capabilities/tool.risk.yaml` y
`../../jevalan/src/crates/jevalan-daemon/tests/conformance.rs`.

## Estado de esta POC

La POC aún **no es un proveedor consumible por Jevalan**:

- `npm run decide` recibe un grupo `fit` explícito, no una petición de
  selección, y devuelve `{ catalog, decision }`, no el envelope del hub.
- La política aprendida predice `expected_fit`; la etiqueta actual no expresa
  qué especialista concreto ganará ni si su ejecución tendrá éxito.
- No hay servidor HTTP, manifiesto de capacidad ni adaptador de envelope.

Por ello, el resultado T8 compara clasificación de intención y no demuestra
que Jevalan pueda ejecutar o consumir la selección.

## Mapeo posible, aún no probado

Un adaptador fuera del núcleo podría ofrecer una capacidad con `input_schema`
para la petición y `decision_schema` para una recomendación como `{ fit,
candidate, evidence, policy }`, y responder con `status: ok`, `provider` y el
`request_id` recibido. El consumidor conservaría la decisión de ejecutar. El
proveedor tendría que funcionar mediante `exec` o `http`, respetar deadlines y
pasar la conformidad. Esta forma es una propuesta; no está implementada ni
probada contra Jevalan.

No se modifica el checkout de Jevalan en esta fase.
