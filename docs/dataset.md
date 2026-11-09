# Dataset inicial de selección

`data/tasks.json` contiene diez peticiones sintéticas con etiquetas manuales
`expected_fit`. Las etiquetas siguen las definiciones de los cinco grupos del
catálogo que representan decisiones: `routing`, `review`, `context`, `gates` y
`supervision`.

Cada grupo tiene un caso `train` y uno `holdout`. El split está guardado en el
archivo antes de ajustar políticas. La muestra es un corpus de humo muy pequeño;
no permite afirmar generalización.

Estas etiquetas clasifican la **intención** de la petición. No identifican un
especialista ganador, no contienen resultados observados, y no demuestran que
un candidato tenga más éxito que otro. Para hacer evaluación de políticas hará
falta reunir resultados reales comparables por candidato, sin inferir
contrafactuales desde una sola decisión observada.

La referencia de snapshot permite rastrear qué revisión local del catálogo y
de las evaluaciones se usó al preparar los casos. Las etiquetas son curación
propia de la POC; no son veredictos añadidos al catálogo.
