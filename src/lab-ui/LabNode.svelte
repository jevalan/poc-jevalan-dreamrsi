<script>
  import { Handle, Position } from '@xyflow/svelte';

  let { data } = $props();
</script>

<Handle type="target" position={Position.Left} />
<article class="flow-card" class:failed={data.tone === 'failed'} class:ready={data.tone === 'ready'}>
  <div class="card-top"><span class="eyebrow">{data.eyebrow}</span><span class="state"><i></i>{data.status}</span></div>
  <h3>{data.title}</h3>
  <p>{data.description}</p>
  {#if data.metrics?.length}
    <div class="metrics">
      {#each data.metrics as metric (metric.label)}
        <div><span>{metric.label}</span><strong>{metric.value}</strong></div>
      {/each}
    </div>
  {/if}
  <div class="node-actions">
    <button class="inspect nodrag" onclick={() => data.onSelect?.()}>{data.action || 'Inspeccionar'} <span>↗</span></button>
    {#if data.actionLabel}
      <button class="run-action nodrag" onclick={() => data.onAction?.()} disabled={data.disabled}>{data.actionLabel}</button>
    {/if}
  </div>
</article>
<Handle type="source" position={Position.Right} />
