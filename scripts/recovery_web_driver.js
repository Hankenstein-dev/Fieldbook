// Orchestrator helper: evaluate this function in functions.exec, where tools exist.
// All queues, original reads and checkpoints live on disk across chat interruptions.
(async function recoveryWebDriver(kind) {
  if (!['kew', 'ranked', 'nonvascular', 'vascular'].includes(kind)) throw new Error('Unknown queue');
  const parse = async (offset) => {
    const r = await tools.exec_command({cmd: `.venv/bin/python scripts/plan_recovery_web_fetches.py ${kind} ${offset}`, max_output_tokens: 12000});
    if (r.exit_code !== 0) throw new Error(r.output.slice(0, 500));
    return JSON.parse(r.output);
  };
  const save = async (path, value) => await tools.apply_patch('*** Begin Patch\n*** Add File: ' + path + '\n' + value.split('\n').map(x => '+' + x).join('\n') + '\n*** End Patch');
  let total = Infinity, last = Date.now(), fetched = 0;
  for (let offset = 0; offset < total; offset += 4) {
    let job = await parse(offset); total = job.total;
    if (job.needsSearch) {
      const queries = job.rows.map(r => ({q: kind === 'kew' ? `site:powo.science.kew.org "${r[1]}"` : kind === 'ranked' ? `"${r[1]}" ${r[3] && r[3] !== r[1] ? `"${r[3]}"` : ''} ${r[2]} botanical description` : `"${r[1]}" description morphology habitat`}));
      const response = String(await tools.web__run({search_query: queries, response_length: 'medium'}));
      await save(job.queryPath, JSON.stringify({rows: job.rows, response, fetchedAt: new Date().toISOString()}, null, 2));
      job = await parse(offset);
    }
    const missing = [...new Map(job.entries.filter(e => e.needsFetch).map(e => [e.pagePath, e])).values()];
    for (let start = 0; start < missing.length; start += 4) {
      const group = missing.slice(start, start + 4);
      const reads = await Promise.allSettled(group.map(async entry => String(await tools.web__run({open: [{ref_id: entry.url}], response_length: 'long'}))));
      for (let i = 0; i < reads.length; i++) {
        const result = reads[i], entry = group[i];
        if (result.status !== 'fulfilled') throw result.reason;
        await save(entry.pagePath, result.value);
        await save(entry.pagePath.replace(/\.txt$/, '.json'), JSON.stringify({url: entry.url, fetchedAt: new Date().toISOString()}, null, 2));
        fetched++;
      }
    }
    if (Date.now() - last >= 60000) {
      notify(`${kind} source recovery: ${Math.min(offset + 4, total)}/${total} names processed; ${fetched} further source reads saved.`);
      last = Date.now();
    }
  }
  await save(`/home/hankenstein/dev/SideBants/Fieldbook/data/raw/pt/plants/recovery-v1/discovery/${kind}/completion.json`, JSON.stringify({kind, total, completedAt: new Date().toISOString()}, null, 2));
  text({kind, names: total, furtherSourceReads: fetched});
})
