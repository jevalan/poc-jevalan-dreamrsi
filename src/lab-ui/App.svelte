<script>
  import { onMount } from 'svelte';
  import { Background, BackgroundVariant, Controls, MiniMap, Panel, SvelteFlow } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import LabNode from './LabNode.svelte';
  import './style.css';
  import './interaction.css';

  const nodeTypes = { labCard: LabNode };
  let nodes = $state([]);
  let edges = $state([]);
  let state = $state(null);
  let selected = $state(null);
  let error = $state('');
  let updatedAt = $state(null);
  let selectedTaskId = $state('routing-holdout-01');
  let exploring = $state(false);
  let exploreMessage = $state('');
  let prompt = $state('');
  let classifying = $state(false);
  let labeling = $state(false);
  let classification = $state(null);
  let classifierMessage = $state('');

  async function get(path) {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.headers.get('content-type')?.includes('application/json') ? response.json() : response.text();
  }

  function card(id, x, y, data) {
    return { id, type: 'labCard', position: { x, y }, data: { ...data, onSelect: () => inspect(data) } };
  }

  function inspect(data) {
    selected = { title: data.title, description: data.detail || data.description, logs: null };
    if (data.trace) {
      Promise.all(data.trace.attempts.map(async (attempt) => {
        const [stdout, stderr] = await Promise.all([get(`/api/runs/${attempt.id}/stdout`), get(`/api/runs/${attempt.id}/stderr`)]);
        return `${attempt.profile} · ${attempt.status} · reward ${attempt.reward}\nSTDOUT\n${stdout || '(vacío)'}\nSTDERR\n${stderr || '(vacío)'}`;
      })).then((logs) => { selected = { ...selected, logs: `${JSON.stringify(data.trace, null, 2)}\n\n${logs.join('\n\n')}` }; })
        .catch((cause) => { selected = { ...selected, logs: cause.message }; });
    }
    if (data.run) {
      Promise.all([get(`/api/runs/${data.run.id}/stdout`), get(`/api/runs/${data.run.id}/stderr`)]).then(([stdout, stderr]) => {
        selected = { ...selected, logs: `STDOUT\n${stdout || '(vacío)'}\n\nSTDERR\n${stderr || '(vacío)'}` };
      }).catch((cause) => { selected = { ...selected, logs: cause.message }; });
    }
  }

  function updateFlow(snapshot) {
    const report = snapshot.evaluation;
    const baseline = report?.baseline?.metrics;
    const optimized = report?.optimized?.metrics;
    const kev = snapshot.backends?.find((backend) => backend.name === 'kev');
    const laya = snapshot.backends?.find((backend) => backend.name === 'laya');
    const latestRun = (name) => snapshot.runs.find((run) => String(run.profile).toLowerCase().startsWith(name));
    const kevRun = latestRun('kev');
    const layaRun = latestRun('laya');
    const latestTrace = snapshot.traces?.[0];
    const runCards = snapshot.runs.slice(0, 4).map((run, index) => {
      const owner = String(run.profile).toLowerCase().includes('laya') ? 'laya' : 'kev';
      return card(`run-${run.id}`, 1050, 25 + index * 175, {
        eyebrow: run.kind || 'ejecución', title: `${run.profile} · ${run.status}`,
        status: run.status === 'failed' ? 'Fallida' : run.status,
        tone: run.status === 'failed' ? 'failed' : 'ready',
        description: `${run.taskId} · ${new Date(run.startedAt).toLocaleTimeString('es-ES')}`,
        detail: run.error || run.taskId, run, action: 'Ver stdout / stderr',
      });
    });

    nodes = [
      card('dataset', 40, 240, {
        eyebrow: 'ENTRADA', title: 'Catálogo & tareas', status: `${snapshot.tasks.length} casos`,
        description: 'Dataset sintético · etiquetas curadas', detail: 'La POC consume el catálogo del hub en modo lectura.',
      }),
      card('policy', 360, 240, {
        eyebrow: 'DREAM-SRI', title: 'Baseline → política', status: 'holdout',
        description: 'Clasificación de fit; no ejecuta especialistas.',
        metrics: [
          { label: 'Baseline', value: baseline ? `${Math.round(baseline.accuracy * 100)}%` : '—' },
          { label: 'Optimizada', value: optimized ? `${Math.round(optimized.accuracy * 100)}%` : '—' },
          { label: 'Casos', value: String(report?.holdoutCaseIds?.length ?? '—') },
        ],
        detail: 'Comparación sobre el mismo holdout. Las etiquetas son intenciones curadas, no resultados reales.',
        actionLabel: 'Exploración pausada (Kev)',
        disabled: true,
        onAction: runBaseline,
      }),
      card('kev', 710, 70, {
        eyebrow: 'BACKEND LOCAL · :8009', title: 'Kev-0.8B', status: 'Aparcado',
        tone: '',
        description: [kev?.model, kev?.device].filter(Boolean).join(' · ') || 'OpenAI-compatible · /v1/systemone',
        detail: `Sin sondeo ni peticiones nuevas a Kev.${kevRun ? ` Última ejecución guardada: ${kevRun.status}.` : ''}`,
      }),
      card('laya', 710, 420, {
        eyebrow: 'BACKEND LOCAL · :8021', title: 'Laya', status: laya?.online ? 'API online' : 'Sin respuesta',
        tone: layaRun?.status === 'failed' ? 'failed' : laya?.online ? 'ready' : '',
        description: 'CPU · OpenAI-compatible · /v1/systemone',
        detail: `OpenAPI: ${laya?.status ?? 'sin respuesta'}${layaRun ? ` · última prueba: ${layaRun.status}` : ''}`,
      }),
      ...runCards,
      card('trace-pool', 1420, 245, {
        eyebrow: 'DREAM-RSI · POOL',
        title: `${snapshot.traces?.length ?? 0} mundos medidos`,
        status: latestTrace ? `${latestTrace.attempts.length} intentos` : 'Vacío',
        tone: latestTrace ? '' : '',
        description: latestTrace ? `${latestTrace.task.id} · reward ${latestTrace.attempts.map((attempt) => attempt.reward).join(' / ')}` : 'Sin exploraciones evaluadas todavía.',
        detail: latestTrace ? `Último mundo ${latestTrace.id}; evaluador ${latestTrace.evaluator}.` : 'Las etiquetas no cuentan como observación hasta ejecutar y puntuar una respuesta.',
        trace: latestTrace,
        action: latestTrace ? 'Abrir última traza' : 'Inspeccionar pool',
      }),
      card('offline-learning', 1740, 245, {
        eyebrow: 'DREAM-RSI · OFFLINE', title: 'Replay & descubrimiento',
        status: 'Pendiente', description: 'Reproducir mundos y evaluar políticas.',
        detail: 'El agente Codex escribirá políticas cuando existan trazas evaluadas y un replay implementado.',
      }),
    ];
    edges = [
      { id: 'dataset-policy', source: 'dataset', target: 'policy', type: 'smoothstep', animated: false },
      { id: 'policy-kev', source: 'policy', target: 'kev', type: 'smoothstep', label: 'probar' },
      { id: 'policy-laya', source: 'policy', target: 'laya', type: 'smoothstep', label: 'probar' },
      ...snapshot.runs.slice(0, 4).map((run) => ({
        id: `edge-${run.id}`, source: String(run.profile).toLowerCase().includes('laya') ? 'laya' : 'kev',
        target: `run-${run.id}`, type: 'smoothstep', animated: run.status === 'running',
      })),
      ...snapshot.runs.filter((run) => run.worldId).slice(0, 4).map((run) => ({ id: `run-pool-${run.id}`, source: `run-${run.id}`, target: 'trace-pool', type: 'smoothstep' })),
      { id: 'pool-replay', source: 'trace-pool', target: 'offline-learning', type: 'smoothstep' },
    ];
  }

  async function refresh() {
    try {
      state = await get('/api/state');
      updateFlow(state);
      error = '';
      updatedAt = new Date();
    } catch (cause) {
      error = cause.message;
    }
  }

  async function runBaseline() {
    if (exploring || !selectedTaskId) return;
    exploring = true;
    exploreMessage = `Explorando ${selectedTaskId} en Kev y Laya…`;
    try {
      const response = await fetch('/api/explore', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ taskId: selectedTaskId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
      exploring = false;
      await refresh();
      exploreMessage = `Mundo guardado · ${result.id}`;
      const trace = state.traces.find((item) => item.id === result.id);
      if (trace) inspect({ title: `Mundo · ${trace.task.id}`, description: 'Exploración baseline sobre ambos candidatos.', trace });
    } catch (cause) {
      exploreMessage = `Error: ${cause.message}`;
    } finally {
      exploring = false;
    }
  }

  async function classifyPrompt() {
    if (!prompt.trim() || classifying) return;
    classifying = true;
    classification = null;
    classifierMessage = '';
    try {
      const response = await fetch('/api/programming/classify', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
      classification = result;
    } catch (cause) {
      classifierMessage = `Error: ${cause.message}`;
    } finally {
      classifying = false;
    }
  }

  async function labelPrompt(label) {
    if (!classification || labeling) return;
    labeling = true;
    try {
      const response = await fetch('/api/programming/label', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), prediction: classification.prediction, confidence: classification.confidence, label }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
      classifierMessage = `Etiqueta guardada: ${label === 'programming' ? 'programación' : 'otra petición'}.`;
      classification = null;
      await refresh();
    } catch (cause) {
      classifierMessage = `Error: ${cause.message}`;
    } finally {
      labeling = false;
    }
  }

  onMount(() => {
    refresh();
    const timer = setInterval(refresh, 4000);
    return () => clearInterval(timer);
  });
</script>

<svelte:head>
  <title>Dream-SRI · Flow Lab</title>
  <meta name="description" content="Laboratorio local de Dream-SRI y sus backends." />
</svelte:head>

<header class="topbar">
  <a class="brand" href="/">D<span>·</span>SRI <small>FLOW LAB</small></a>
  <div class="top-status"><i class:up={!error}></i>{error ? `API ${error}` : 'LABORATORIO LOCAL'} <span>127.0.0.1</span></div>
</header>

<main>
  <section class="heading">
    <div><p class="eyebrow">DREAM-SRI / OBSERVABILIDAD</p><h1>El flujo de ejecución, <em>caja por caja.</em></h1></div>
    <div class="refresh">
      <label class="task-pick">Tarea <select bind:value={selectedTaskId}>{#each state?.tasks ?? [] as task (task.id)}<option value={task.id}>{task.id} · {task.partition}</option>{/each}</select></label>
      <button onclick={refresh}>↻ Actualizar</button>
      <span>Actualizado {updatedAt ? updatedAt.toLocaleTimeString('es-ES') : '—'}</span>
    </div>
  </section>

  <section class="classifier" aria-labelledby="classifier-title">
    <div class="classifier-form">
      <p class="eyebrow">CLASIFICADOR LOCAL · LAYA</p>
      <h2 id="classifier-title">¿Es una tarea de programación?</h2>
      <label for="prompt-input">Escribe una petición</label>
      <textarea id="prompt-input" bind:value={prompt} maxlength="5000" placeholder="Ej.: Revisa este repositorio y corrige el error al iniciar…"></textarea>
      <div class="classifier-actions">
        <span>{prompt.length}/5000</span>
        <button onclick={classifyPrompt} disabled={classifying || !prompt.trim()}>{classifying ? 'Clasificando…' : 'Clasificar con Laya'}</button>
      </div>
      {#if classification}
        <div class="prediction" role="status">
          <strong>Laya dice: {classification.prediction === 'programming' ? 'Programación' : 'Otra petición'}</strong>
          {#if classification.confidence !== null}<span>Confianza {Math.round(classification.confidence * 100)}%</span>{/if}
          <p>Confirma o corrige la etiqueta para añadir este ejemplo al dataset.</p>
          <div class="label-actions">
            <button onclick={() => labelPrompt('programming')} disabled={labeling}>Sí, programación</button>
            <button onclick={() => labelPrompt('other')} disabled={labeling}>No, otra petición</button>
          </div>
        </div>
      {/if}
      {#if classifierMessage}<p class="classifier-message" role="status">{classifierMessage}</p>{/if}
      <p class="local-note">Solo se guardan las muestras que etiquetes. Permanecen localmente en <code>runs/programming-classifier.jsonl</code>.</p>
    </div>
    <div class="classifier-data">
      <p class="eyebrow">DATASET ETIQUETADO</p>
      <strong class="dataset-total">{state?.classifierDataset?.total ?? 0} <small>muestras</small></strong>
      <p class="detail-text">Coincidencia de Laya con tu etiqueta: {state?.classifierDataset?.total ? `${Math.round(state.classifierDataset.correct / state.classifierDataset.total * 100)}% (${state.classifierDataset.correct}/${state.classifierDataset.total})` : '—'}.</p>
      <p class="detail-text">Es una medida descriptiva del dataset, no un modelo reentrenado.</p>
      <ul class="examples">
        {#each state?.classifierDataset?.recent ?? [] as example, index (`${example.createdAt}-${index}`)}
          <li><span class:match={example.prediction === example.label} class:mismatch={example.prediction !== example.label}>{example.prediction === example.label ? '✓' : '×'}</span><div><strong>{example.label === 'programming' ? 'Programación' : 'Otra'}</strong><small>Laya: {example.prediction === 'programming' ? 'Programación' : 'Otra'} · {new Date(example.createdAt).toLocaleString('es-ES')}</small><p>{example.prompt}</p></div></li>
        {/each}
      </ul>
    </div>
  </section>

  <section class="workspace" aria-label="Grafo de servicios y ejecuciones">
    <div class="canvas">
      {#if state}
        <SvelteFlow bind:nodes bind:edges {nodeTypes} fitView fitViewOptions={{ padding: 0.18 }} nodesConnectable={false} nodesDeletable={false} colorMode="dark">
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          <Controls />
          <MiniMap pannable zoomable />
          <Panel position="top-left" class="canvas-label"><span class="live-dot"></span> FLUJO ACTUAL <span>{state.traces?.length ?? 0} MUNDOS</span></Panel>
        </SvelteFlow>
      {:else}
        <div class="loading">{error || 'Conectando con Dream-SRI…'}</div>
      {/if}
    </div>
    <aside class="inspector">
      <p class="eyebrow">INSPECTOR</p>
      {#if selected}
        <h2>{selected.title}</h2>
        <p class="detail-text">{selected.description}</p>
        {#if selected.logs !== null}
          <pre>{selected.logs ?? 'Cargando logs…'}</pre>
        {/if}
      {:else}
        <h2>Selecciona una caja</h2>
        <p class="detail-text">Inspecciona el dataset, la evaluación, el estado de los backends o los logs de una ejecución.</p>
      {/if}
      <div class="legend"><span><i class="ok"></i> API disponible</span><span><i class="bad"></i> Ejecución fallida</span><span><i class="idle"></i> Sin endpoint</span></div>
      <div class="honesty"><strong>Lectura honesta</strong><p>La evaluación usa etiquetas curadas. Los nodos run reflejan comprobaciones reales y sus errores.</p></div>
    </aside>
  </section>
  {#if exploreMessage}<p class="explore-message" role="status">{exploreMessage}</p>{/if}
  <footer><span>DREAM-SRI · POC</span><span>Datos y procesos locales · Sin acceso a red externa</span></footer>
</main>
