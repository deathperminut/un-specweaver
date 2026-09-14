// Dos vistas del mismo modelo: texto para la terminal y un HTML autocontenido (CSS y JS
// inline, sin CDN, sin servidor) que se abre en el navegador y funciona offline y en CI.
// Un compañero lo abre sin instalar nada. Es el mismo modelo que graphify usa para graph.html.

const L = {
  es: {
    title: 'Estado del proyecto', phases: 'Fases', requirements: 'Requisitos', changes: 'Changes', sprint: 'Sprint',
    decisions: 'Decisiones', timeline: 'Historial', map: 'Mapa del codigo', memory: 'Memoria',
    phase: { understand: 'Entender', decide: 'Decidir', decompose: 'Descomponer', translate: 'Traducir', build: 'Construir', close: 'Cerrar' },
    state: { pending: 'pendiente', 'in-progress': 'en curso', done: 'tareas completas', archived: 'archivado', missing: 'sin change' },
    done: 'hecha', partial: 'en curso', notyet: 'pendiente', wave: 'Ola', current: 'ola actual', ready: 'se puede empezar',
    blockedBy: 'bloqueada por', toArchive: 'falta archivar', stories: 'stories', tasks: 'tareas', revision: 'rev', unstable: 'Requisitos que mas han cambiado',
    changesN: 'cambios', mentions: 'menciones', orphans: 'FR sin story', none: 'ninguno', coverage: 'cubierto por',
    noTrace: 'Sin trace.json todavia: corre el puente (/sw:new fase 2).', noSprint: 'Sin epics.md: no hay olas que calcular.',
    noDecisions: 'Sin memlogs todavia: BMAD los escribe al conversar.', generated: 'generado', entries: 'entradas', sources: 'fuentes',
    graphNodes: 'nodos', graphEdges: 'aristas', openGraph: 'abrir graph.html', noGraph: 'sin grafo (graphify update .)',
    engramOn: 'Engram atado a', engramOff: 'Engram sin atar (init)', engramAbsent: 'Engram no instalado',
    total: 'total', archived: 'archivados', inProgress: 'en curso', hint: 'Regenerar: npx un-specweaver status --html',
    delta: { ADDED: 'nuevo', MODIFIED: 'modificado' }, summary: 'Resumen', of: 'de',
  },
  en: {
    title: 'Project status', phases: 'Phases', requirements: 'Requirements', changes: 'Changes', sprint: 'Sprint',
    decisions: 'Decisions', timeline: 'History', map: 'Code map', memory: 'Memory',
    phase: { understand: 'Understand', decide: 'Decide', decompose: 'Decompose', translate: 'Translate', build: 'Build', close: 'Close' },
    state: { pending: 'pending', 'in-progress': 'in progress', done: 'tasks complete', archived: 'archived', missing: 'no change' },
    done: 'done', partial: 'in progress', notyet: 'pending', wave: 'Wave', current: 'current wave', ready: 'ready to start',
    blockedBy: 'blocked by', toArchive: 'archive pending', stories: 'stories', tasks: 'tasks', revision: 'rev', unstable: 'Requirements that changed most',
    changesN: 'changes', mentions: 'mentions', orphans: 'FR without story', none: 'none', coverage: 'covered by',
    noTrace: 'No trace.json yet: run the bridge (/sw:new phase 2).', noSprint: 'No epics.md: no waves to compute.',
    noDecisions: 'No memlogs yet: BMAD writes them while conversing.', generated: 'generated', entries: 'entries', sources: 'sources',
    graphNodes: 'nodes', graphEdges: 'edges', openGraph: 'open graph.html', noGraph: 'no graph (graphify update .)',
    engramOn: 'Engram bound to', engramOff: 'Engram not bound (init)', engramAbsent: 'Engram not installed',
    total: 'total', archived: 'archived', inProgress: 'in progress', hint: 'Regenerate: npx un-specweaver status --html',
    delta: { ADDED: 'new', MODIFIED: 'modified' }, summary: 'Summary', of: 'of',
  },
};

const mark = (p) => (p.done ? '●' : p.partial ? '◐' : '○');
const bar = (done, total, w = 10) => (total ? '▮'.repeat(Math.round((done / total) * w)).padEnd(w, '▯') : '▯'.repeat(w));

export function renderTerminal(s, lang = 'es') {
  const t = L[lang] || L.es;
  const o = [];
  o.push(`\n${t.title}: ${s.project.name}  (${s.generatedAt.slice(0, 16).replace('T', ' ')})\n`);

  o.push(`${t.phases}`);
  for (const p of s.phases) {
    const extra = p.count != null ? `  ${p.count}` : p.artifacts?.length ? `  ${p.artifacts.map((a) => a.file).join(', ')}` : '';
    o.push(`  ${mark(p)} ${String(p.n)}. ${t.phase[p.key].padEnd(12)} ${p.done ? t.done : p.partial ? t.partial : t.notyet}${extra}`);
  }

  o.push(`\n${t.changes}  ${s.changes.length} ${t.total}, ${s.changes.filter((c) => c.state === 'archived').length} ${t.archived}, ${s.changes.filter((c) => c.state === 'in-progress' || c.state === 'done').length} ${t.inProgress}`);
  for (const c of s.changes) {
    const pr = c.state === 'archived' ? `${t.state.archived} ${c.archivedAt || ''}` : `${bar(c.progress.done, c.progress.total)} ${c.progress.done}/${c.progress.total} ${t.tasks} · ${t.state[c.state]}`;
    o.push(`  ${(c.story || '').padEnd(5)} ${c.id.padEnd(48)} ${pr}${c.revision > 1 ? `  ${t.revision} ${c.revision}` : ''}`);
  }

  o.push(`\n${t.sprint}`);
  if (!s.sprint) o.push(`  ${t.noSprint}`);
  else {
    for (const w of s.sprint.waves) {
      o.push(`  ${t.wave} ${w.n}${w.n === s.sprint.current ? ` ← ${t.current}` : ''}`);
      for (const i of w.items) {
        const st = i.state === 'archived' ? t.state.archived : i.state === 'done' ? `${t.state.done} · ${t.toArchive}` : i.ready ? `${t.state[i.state]} · ${t.ready}` : i.blockedBy.length ? `${t.blockedBy} ${i.blockedBy.join(', ')}` : t.state[i.state];
        o.push(`    ${i.story.padEnd(5)} ${i.title.slice(0, 44).padEnd(44)} ${st}`);
      }
    }
    if (s.sprint.cycles.length) o.push(`  ⚠ ${s.sprint.cycles.join(', ')}`);
  }

  o.push(`\n${t.requirements}`);
  if (!s.requirements.rows.length) o.push(`  ${t.noTrace}`);
  else {
    const top = s.requirements.rows.filter((r) => r.changes > 0).sort((a, b) => b.changes - a.changes).slice(0, 8);
    o.push(`  ${t.unstable}: ${top.length ? top.map((r) => `${r.id} (${r.changes})`).join(', ') : t.none}`);
    o.push(`  ${t.orphans}: ${s.requirements.orphans.length ? s.requirements.orphans.join(', ') : t.none}`);
  }

  o.push(`\n${t.decisions}  ${s.decisions.total} ${t.entries}, ${s.decisions.sources} ${t.sources}${s.decisions.total ? '  ' + Object.entries(s.decisions.byType).map(([k, v]) => `${k} ${v}`).join(' · ') : `  ${t.noDecisions}`}`);

  o.push(`\n${t.map}  ${s.graph.path ? `${s.graph.nodes} ${t.graphNodes}, ${s.graph.edges} ${t.graphEdges}${s.graph.html ? ` · ${s.graph.html}` : ''}` : t.noGraph}`);
  o.push(`${t.memory}  ${s.engram.available ? (s.engram.project ? `${t.engramOn} "${s.engram.project}"` : t.engramOff) : t.engramAbsent}`);
  o.push(`\n${t.hint}\n`);
  return o.join('\n');
}

const esc = (x) => String(x ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Textos de la app (cliente). Se embeben junto con el modelo; el HTML no depende de nada externo.
const UI = {
  es: {
    chain: 'Del requisito a la tarea', chainHint: 'click en un anillo para ver que esta completo y que no',
    frDone: 'FR completados', frDoneHint: 'todas sus stories terminadas', specsDone: 'specs cerradas', tasksDone: 'tareas hechas', storiesDoneShort: 'stories terminadas',
    alertUnstable: 'requisitos inestables', alertHint: 'han cambiado 2 o mas veces despues de nacer — click para ver cuales y por que',
    alertNone: 'ningun requisito inestable', alertWhy: 'Un requisito que cambia varias veces es un requisito que el equipo no entiende igual. Cada cambio arrastra stories, specs y codigo ya hecho. Antes de tocar uno de estos, lee su historial y confirma con quien lo pidio.',
    tabDone: 'Completados', tabPending: 'Pendientes', canvasFR: 'Requisitos funcionales', canvasStories: 'Stories', canvasSpecs: 'Specs', canvasTasks: 'Tareas', canvasUnstable: 'Requisitos inestables',
    frNoStory: 'sin story que lo construya', frPendingStories: 'stories pendientes', frRemoved: 'eliminados por decision', frRemovedHint: 'Sigue en el PRD tachado para que el identificador no se reutilice. No cuenta como pendiente ni como completado.',
    work: 'Cuando se trabajo', workHint: 'cada dia con actividad registrada y que paso ese dia. Los dias sin registro no aparecen: no se sabe que paso.',
    dayDec: 'decisiones', dayChg: 'cambios', dayBridge: 'corridas del puente', dayArch: 'specs cerradas', dayArt: 'artefactos', gap: 'dias sin registro', activeDays: 'dias con actividad',
    memory: 'Memoria del proyecto', tabHistory: 'Historial paso a paso', tabKey: 'Decisiones clave', tabImpacts: 'Cambios e impacto', tabStats: 'Por etapa',
    stEntries: 'entradas', stKind: 'Etapa', stDec: 'decisiones', stChg: 'cambios', stOvr: 'descartes', stAsm: 'supuestos', stOther: 'otras',
    title: 'Estado del proyecto', how: '¿Como vamos?', glossary: 'Nomenclatura', glossaryHint: 'que significa cada sigla',
    complete: 'completado', storiesDone: 'stories terminadas', tasks: 'tareas hechas', coverage: 'requisitos con story',
    archived: 'specs archivadas', unclosed: 'terminadas sin cerrar', wave: 'ola actual', ready: 'listas para empezar', revisions: 'revisiones', decisions: 'decisiones registradas',
    days: 'dias de trabajo', unstable: 'requisitos inestables', of: 'de', phases: 'Fases del metodo',
    phase: { understand: 'Entender', decide: 'Decidir', decompose: 'Descomponer', translate: 'Traducir', build: 'Construir', close: 'Cerrar' },
    effort: 'Esfuerzo por etapa', effortHint: 'lo que el metodo deja escrito: decisiones, cambios, supuestos, artefactos. No horas.',
    kind: { briefs: 'Brief', prds: 'PRD', architecture: 'Arquitectura', 'ux-designs': 'UX', 'change-proposal': 'Cambios de alcance' },
    entries: 'entradas', dec: 'decisiones', chg: 'cambios', ovr: 'descartes', asm: 'supuestos',
    funnel: 'Descomposicion', funnelHint: 'del PRD al codigo', req: 'requisitos', epics: 'epics', stories: 'stories', criteria: 'criterios', tasksN: 'tareas', specs: 'specs',
    flow: 'Flujo: del requisito a la spec', flowHint: 'click en un bloque para ver el detalle y su camino', colReq: 'Requisitos (PRD)', colEpic: 'Epics', colStory: 'Stories', colSpec: 'Specs (OpenSpec → Gentle-AI)',
    noStory: 'sin story', changesN: 'cambios', ac: 'AC', fr: 'FR', tasksShort: 'tareas', rev: 'rev',
    state: { pending: 'pendiente', 'in-progress': 'en curso', done: 'terminada', archived: 'archivada', missing: 'sin spec' },
    impacts: 'Cambios y a que afectaron', impactsHint: 'cada cambio registrado, los requisitos que cita y las stories que toca', affects: 'afecta a', noImpacts: 'sin cambios registrados todavia',
    key: 'Decisiones para tener presentes', keyHint: 'descartes con motivo primero: son las que se reabren por accidente',
    type: { override: 'descartado', constraint: 'restriccion', decision: 'decision', direction: 'direccion', change: 'cambio', modified: 'spec modificada', generated: 'specs generadas', archived: 'archivada', assumption: 'supuesto', event: 'evento', question: 'pregunta', version: 'version' },
    history: 'Historial paso a paso', historyHint: 'decisiones, cambios, corridas del puente y archives, en orden', noHistory: 'todavia no hay historial',
    detail: 'Detalle', close: 'cerrar', epic: 'Epic', storyOf: 'Story', role: 'Como', want: 'quiero', benefit: 'para', reqOf: 'Requisitos', criteriaOf: 'Criterios de aceptacion',
    given: 'Dado', when: 'Cuando', then: 'Entonces', and: 'Y', spec: 'Spec', progress: 'Avance', covers: 'Cubierto por', reqHistory: 'Historia del requisito', noHist: 'sin cambios registrados: estable',
    storiesOf: 'Stories del epic', goal: 'Objetivo', map: 'Mapa del codigo', nodes: 'nodos', edges: 'aristas', engram: 'Memoria', bound: 'atada a', unbound: 'sin atar', absent: 'no instalada',
    generated: 'generado', regen: 'Regenerar: npx un-specweaver status --open', source: 'fuente', empty: 'Nada todavia. Este proyecto no ha pasado por /sw:new.',
    gloss: [
      ['FR', 'Requisito funcional: algo que el producto hace. Numerado en el PRD; todo lo demas se rastrea hasta uno.'],
      ['NFR', 'Requisito no funcional: rendimiento, seguridad, accesibilidad. Restringe como se hace.'],
      ['UX-DR', 'Requisito de diseño de experiencia: sale del diseño UX y se mapea a stories.'],
      ['AD', 'Decision de arquitectura: tecnica, tomada una vez, vinculante para todas las stories.'],
      ['Epic', 'Un bloque de valor del producto. Agrupa stories; equivale a una capability en las specs.'],
      ['Story', 'La unidad que una persona puede terminar. "Como X quiero Y para Z" + criterios de aceptacion.'],
      ['AC', 'Criterio de aceptacion (Dado / Cuando / Entonces). Cada uno se vuelve un escenario de prueba.'],
      ['Spec', 'El contrato ejecutable de una story (OpenSpec). Se genera, no se escribe a mano. Gentle-AI construye contra el.'],
      ['Change', 'La carpeta de trabajo de una spec: propuesta, tareas, delta. Al terminar se archiva y pasa a ser la verdad.'],
      ['Ola', 'Conjunto de stories que se pueden construir en paralelo porque no dependen entre si.'],
      ['Revision', 'Una story ya construida que cambio: su spec se regenera como rev 2, 3… sin perder la anterior.'],
      ['Descarte', 'Una opcion que se evaluo y se rechazo, con motivo. Reabrirla sin saberlo es el error mas caro.'],
    ],
  },
  en: {
    chain: 'From requirement to task', chainHint: 'click a ring to see what is complete and what is not',
    frDone: 'FR completed', frDoneHint: 'all their stories finished', specsDone: 'specs closed', tasksDone: 'tasks done', storiesDoneShort: 'stories finished',
    alertUnstable: 'unstable requirements', alertHint: 'changed 2 or more times after birth — click to see which and why',
    alertNone: 'no unstable requirements', alertWhy: 'A requirement that changes several times is one the team does not understand the same way. Each change drags stories, specs and code already done. Before touching one of these, read its history and confirm with whoever asked for it.',
    tabDone: 'Completed', tabPending: 'Pending', canvasFR: 'Functional requirements', canvasStories: 'Stories', canvasSpecs: 'Specs', canvasTasks: 'Tasks', canvasUnstable: 'Unstable requirements',
    frNoStory: 'no story builds it', frPendingStories: 'pending stories', frRemoved: 'removed by decision', frRemovedHint: 'Stays struck through in the PRD so the identifier is not reused. Counts neither as pending nor as completed.',
    work: 'When work happened', workHint: 'every day with recorded activity and what happened. Days without records do not appear: nobody knows what happened.',
    dayDec: 'decisions', dayChg: 'changes', dayBridge: 'bridge runs', dayArch: 'specs closed', dayArt: 'artifacts', gap: 'days without records', activeDays: 'active days',
    memory: 'Project memory', tabHistory: 'Step-by-step history', tabKey: 'Key decisions', tabImpacts: 'Changes and impact', tabStats: 'Per stage',
    stEntries: 'entries', stKind: 'Stage', stDec: 'decisions', stChg: 'changes', stOvr: 'discards', stAsm: 'assumptions', stOther: 'other',
    title: 'Project status', how: 'How are we doing?', glossary: 'Glossary', glossaryHint: 'what each acronym means',
    complete: 'complete', storiesDone: 'stories finished', tasks: 'tasks done', coverage: 'requirements with a story',
    archived: 'specs archived', unclosed: 'finished but not closed', wave: 'current wave', ready: 'ready to start', revisions: 'revisions', decisions: 'decisions recorded',
    days: 'working days', unstable: 'unstable requirements', of: 'of', phases: 'Method phases',
    phase: { understand: 'Understand', decide: 'Decide', decompose: 'Decompose', translate: 'Translate', build: 'Build', close: 'Close' },
    effort: 'Effort per stage', effortHint: 'what the method leaves written: decisions, changes, assumptions, artifacts. Not hours.',
    kind: { briefs: 'Brief', prds: 'PRD', architecture: 'Architecture', 'ux-designs': 'UX', 'change-proposal': 'Scope changes' },
    entries: 'entries', dec: 'decisions', chg: 'changes', ovr: 'discards', asm: 'assumptions',
    funnel: 'Decomposition', funnelHint: 'from PRD to code', req: 'requirements', epics: 'epics', stories: 'stories', criteria: 'criteria', tasksN: 'tasks', specs: 'specs',
    flow: 'Flow: from requirement to spec', flowHint: 'click a block to see its detail and path', colReq: 'Requirements (PRD)', colEpic: 'Epics', colStory: 'Stories', colSpec: 'Specs (OpenSpec → Gentle-AI)',
    noStory: 'no story', changesN: 'changes', ac: 'AC', fr: 'FR', tasksShort: 'tasks', rev: 'rev',
    state: { pending: 'pending', 'in-progress': 'in progress', done: 'finished', archived: 'archived', missing: 'no spec' },
    impacts: 'Changes and what they affected', impactsHint: 'each recorded change, the requirements it cites and the stories it touches', affects: 'affects', noImpacts: 'no changes recorded yet',
    key: 'Decisions to keep in mind', keyHint: 'discards with their reason first: those are the ones reopened by accident',
    type: { override: 'discarded', constraint: 'constraint', decision: 'decision', direction: 'direction', change: 'change', modified: 'spec modified', generated: 'specs generated', archived: 'archived', assumption: 'assumption', event: 'event', question: 'question', version: 'version' },
    history: 'Step-by-step history', historyHint: 'decisions, changes, bridge runs and archives, in order', noHistory: 'no history yet',
    detail: 'Detail', close: 'close', epic: 'Epic', storyOf: 'Story', role: 'As', want: 'I want', benefit: 'so that', reqOf: 'Requirements', criteriaOf: 'Acceptance criteria',
    given: 'Given', when: 'When', then: 'Then', and: 'And', spec: 'Spec', progress: 'Progress', covers: 'Covered by', reqHistory: 'Requirement history', noHist: 'no recorded changes: stable',
    storiesOf: 'Stories in this epic', goal: 'Goal', map: 'Code map', nodes: 'nodes', edges: 'edges', engram: 'Memory', bound: 'bound to', unbound: 'not bound', absent: 'not installed',
    generated: 'generated', regen: 'Regenerate: npx un-specweaver status --open', source: 'source', empty: 'Nothing yet. This project has not gone through /sw:new.',
    gloss: [
      ['FR', 'Functional requirement: something the product does. Numbered in the PRD; everything else traces back to one.'],
      ['NFR', 'Non-functional requirement: performance, security, accessibility. Constrains how it is done.'],
      ['UX-DR', 'UX design requirement: comes out of the UX design and maps to stories.'],
      ['AD', 'Architecture decision: technical, made once, binding for every story.'],
      ['Epic', 'A block of product value. Groups stories; equals a capability in the specs.'],
      ['Story', 'The unit one person can finish. "As X I want Y so that Z" + acceptance criteria.'],
      ['AC', 'Acceptance criterion (Given / When / Then). Each becomes a test scenario.'],
      ['Spec', 'The executable contract of a story (OpenSpec). Generated, never hand-written. Gentle-AI builds against it.'],
      ['Change', 'The working folder of a spec: proposal, tasks, delta. When finished it is archived and becomes the truth.'],
      ['Wave', 'A set of stories that can be built in parallel because they do not depend on each other.'],
      ['Revision', 'An already-built story that changed: its spec is regenerated as rev 2, 3… without losing the previous one.'],
      ['Discard', 'An option that was evaluated and rejected, with a reason. Reopening it unknowingly is the most expensive mistake.'],
    ],
  },
};

export function renderHtml(s, lang = 'es') {
  const ui = UI[lang] || UI.es;
  const json = JSON.stringify({ model: s, ui, lang }).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="${esc(lang)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(s.project.name)} — ${esc(ui.title)}</title>
<style>
:root{color-scheme:dark;--bg:#0a0e17;--bg2:#0d1321;--card:#121a2b;--card2:#182236;--line:#1f2b41;--line2:#2a3a57;--fg:#e6edf6;--muted:#8a97ae;--dim:#5b6780;
--acc:#38bdf8;--acc-soft:rgba(56,189,248,.14);--good:#4ade80;--good-soft:rgba(74,222,128,.14);--warn:#fab219;--warn-soft:rgba(250,178,25,.14);--crit:#f26161;--crit-soft:rgba(242,97,97,.16);--vio:#a78bfa;
--mono:ui-monospace,SFMono-Regular,Menlo,"JetBrains Mono",monospace;--sans:Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
*{box-sizing:border-box}html{background:var(--bg)}body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.5 var(--sans);-webkit-font-smoothing:antialiased}
a{color:var(--acc)}code,.mono{font-family:var(--mono);font-size:12px}
.top{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:12px;padding:10px 20px;background:rgba(10,14,23,.92);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
.logo{display:flex;align-items:center;gap:8px;font-weight:600}.logo i{width:24px;height:24px;border-radius:7px;background:linear-gradient(135deg,var(--acc),#6366f1);display:inline-block}
.pill{display:inline-flex;align-items:center;gap:6px;padding:2px 9px;border:1px solid var(--line2);border-radius:999px;font-size:12px;color:var(--muted);background:var(--bg2)}.pill b{color:var(--fg);font-weight:500}
.pill .dot{width:7px;height:7px;border-radius:50%;background:var(--good)}.pill .dot.warn{background:var(--warn)}.pill .dot.off{background:var(--dim)}
.top .sp{flex:1}main{max-width:1280px;margin:0 auto;padding:20px 20px 60px}
section{margin-top:28px}h2{font-size:15px;font-weight:600;margin:0 0 4px;letter-spacing:.2px}h2+.hint,.hint{color:var(--muted);font-size:12.5px;margin:0 0 12px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px}
details.gloss{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 14px}details.gloss summary{cursor:pointer;color:var(--muted);font-size:13px;list-style:none;display:flex;gap:8px;align-items:center}
details.gloss summary::before{content:'▸';color:var(--acc)}details.gloss[open] summary::before{content:'▾'}.gloss-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:8px 18px;margin-top:10px}
.gloss-grid div{font-size:12.5px;color:var(--muted)}.gloss-grid b{font-family:var(--mono);color:var(--acc);font-weight:600;margin-right:6px}
.hero{display:grid;grid-template-columns:220px 1fr;gap:14px}.ring{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px}
.ring svg{width:150px;height:150px}.ring .n{font-size:34px;font-weight:700;letter-spacing:-1px}.ring small{color:var(--muted)}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}.tile{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px;min-height:78px}
.tile .v{font-size:24px;font-weight:600;letter-spacing:-.5px;font-variant-numeric:tabular-nums}.tile .v small{font-size:13px;color:var(--muted);font-weight:400;margin-left:3px}.tile .l{color:var(--muted);font-size:12px;margin-top:2px}
.tile.warn{border-color:rgba(250,178,25,.5)}.tile .bar{margin-top:8px}.bar{height:6px;background:var(--line);border-radius:3px;overflow:hidden}.bar i{display:block;height:100%;background:var(--acc);border-radius:3px}.bar i.good{background:var(--good)}
.stepper{display:flex;align-items:center;gap:0;margin-top:14px;overflow-x:auto;padding:4px 0}.step{display:flex;align-items:center;gap:8px;white-space:nowrap}.step .c{width:22px;height:22px;border-radius:50%;border:2px solid var(--line2);display:grid;place-items:center;font-size:11px;color:var(--muted);flex:none}
.step.done .c{background:var(--good-soft);border-color:var(--good);color:var(--good)}.step.partial .c{background:var(--warn-soft);border-color:var(--warn);color:var(--warn)}.step .t{font-size:12.5px}.step.done .t{color:var(--fg)}.step .t{color:var(--muted)}
.step .ln{width:46px;height:2px;background:var(--line2);margin:0 8px;flex:none}.step.done .ln{background:var(--good)}
.effort{display:grid;grid-template-columns:1fr 1fr;gap:14px}@media(max-width:860px){.effort,.hero{grid-template-columns:1fr}}
.erow{display:grid;grid-template-columns:110px 1fr auto;gap:10px;align-items:center;padding:6px 0;border-bottom:1px solid var(--line)}.erow:last-child{border:0}.erow .k{color:var(--muted);font-size:12.5px}.erow .bars{display:flex;gap:2px;height:10px}.erow .bars i{display:block;height:100%;border-radius:2px}
.erow .n{font-family:var(--mono);font-size:11px;color:var(--muted);white-space:nowrap}.legend{display:flex;gap:14px;flex-wrap:wrap;font-size:11.5px;color:var(--muted);margin-top:8px}.legend i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:5px;vertical-align:-1px}
.funnel{display:flex;align-items:stretch;gap:0;overflow-x:auto}.fstep{flex:1;min-width:110px;background:var(--card2);border:1px solid var(--line);border-radius:8px;padding:10px 12px;position:relative}.fstep+.fstep{margin-left:22px}.fstep+.fstep::before{content:'→';position:absolute;left:-19px;top:50%;transform:translateY(-50%);color:var(--dim);font-size:16px}
.fstep .v{font-size:22px;font-weight:600}.fstep .l{color:var(--muted);font-size:12px}
.flow{position:relative;background:radial-gradient(circle,var(--line) 1px,transparent 1px) 0 0/22px 22px,var(--bg2);border:1px solid var(--line);border-radius:12px;padding:16px;overflow-x:auto}
.cols{display:grid;grid-template-columns:repeat(4,minmax(220px,1fr));gap:56px;position:relative;z-index:1;min-width:1000px}.col h4{margin:0 0 10px;font-size:11px;letter-spacing:.8px;text-transform:uppercase;color:var(--muted);font-weight:600}
.blk{background:var(--card);border:1px solid var(--line2);border-radius:8px;padding:9px 11px;margin-bottom:10px;cursor:pointer;transition:border-color .15s,box-shadow .15s,opacity .15s;position:relative}
.blk:hover{border-color:var(--acc)}.blk.sel{border-color:var(--acc);box-shadow:0 0 0 2px var(--acc-soft),0 0 18px rgba(56,189,248,.15)}.blk.lit{border-color:var(--acc)}.flow.focus .blk:not(.lit):not(.sel){opacity:.28}
.blk .id{font-family:var(--mono);font-size:11.5px;color:var(--acc);display:flex;justify-content:space-between;align-items:center;gap:6px}.blk .tt{font-size:13px;margin:3px 0 5px;line-height:1.35}
.blk .meta{display:flex;gap:6px;flex-wrap:wrap;align-items:center;font-size:11px;color:var(--muted)}.tag{display:inline-flex;align-items:center;gap:4px;padding:1px 7px;border-radius:5px;font-family:var(--mono);font-size:11px;background:var(--card2);border:1px solid var(--line2);color:var(--muted)}
.tag.fr{color:var(--good);border-color:rgba(74,222,128,.35);background:var(--good-soft)}.tag.warn{color:var(--warn);border-color:rgba(250,178,25,.4);background:var(--warn-soft)}.tag.crit{color:var(--crit);border-color:rgba(242,97,97,.4);background:var(--crit-soft)}
.tag.acc{color:var(--acc);border-color:rgba(56,189,248,.4);background:var(--acc-soft)}.tag.vio{color:var(--vio);border-color:rgba(167,139,250,.4);background:rgba(167,139,250,.14)}.tag.dim{color:var(--dim)}
.st{display:inline-flex;align-items:center;gap:5px;font-size:11px}.st::before{content:'';width:7px;height:7px;border-radius:50%;background:var(--dim)}.st.in-progress::before{background:var(--acc)}.st.done::before{background:var(--good)}.st.archived::before{background:var(--good);box-shadow:0 0 0 2px var(--good-soft)}.st.missing::before{background:var(--crit)}
.blk .mini{height:4px;background:var(--line);border-radius:2px;margin-top:6px;overflow:hidden}.blk .mini i{display:block;height:100%;background:var(--acc)}
svg.wires{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0}svg.wires path{fill:none;stroke:var(--line2);stroke-width:1.5;opacity:.7}svg.wires path.lit{stroke:var(--acc);stroke-width:2;opacity:1}.flow.focus svg.wires path:not(.lit){opacity:.15}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:10px}.dc{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px;font-size:13px}.dc .h{display:flex;gap:8px;align-items:center;margin-bottom:6px;flex-wrap:wrap}.dc time{font-family:var(--mono);font-size:11px;color:var(--muted)}
.dc p{margin:0;color:var(--fg)}.dc .refs{margin-top:8px;display:flex;gap:5px;flex-wrap:wrap}.dc .chip{cursor:pointer}.dc .chip:hover{border-color:var(--acc)}.dc.override{border-left:3px solid var(--crit)}.dc.constraint{border-left:3px solid var(--warn)}.dc.decision{border-left:3px solid var(--acc)}.dc.direction{border-left:3px solid var(--vio)}
.grp{margin-top:14px}.grp h4{margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:.7px;color:var(--muted)}
.tl{list-style:none;margin:0;padding:0 0 0 22px;position:relative}.tl::before{content:'';position:absolute;left:7px;top:6px;bottom:6px;width:2px;background:var(--line2)}.tl li{position:relative;padding:0 0 16px 14px}.tl li::before{content:'';position:absolute;left:-19px;top:5px;width:10px;height:10px;border-radius:50%;background:var(--card);border:2px solid var(--line2)}
.tl li.t-override::before,.tl li.t-modified::before{border-color:var(--crit);background:var(--crit-soft)}.tl li.t-change::before{border-color:var(--warn);background:var(--warn-soft)}.tl li.t-archived::before,.tl li.t-generated::before{border-color:var(--good);background:var(--good-soft)}.tl li.t-decision::before{border-color:var(--acc);background:var(--acc-soft)}
.tl .h{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:2px}.tl time{font-family:var(--mono);font-size:11px;color:var(--muted)}.tl p{margin:0;font-size:13px}.tl small{color:var(--dim);font-family:var(--mono);font-size:11px}
.tl .day{font-family:var(--mono);font-size:11px;color:var(--acc);margin:6px 0 10px -22px;padding-left:0;list-style:none}
.drawer{position:fixed;top:0;right:0;bottom:0;width:min(440px,92vw);background:var(--bg2);border-left:1px solid var(--line2);transform:translateX(105%);transition:transform .2s;z-index:30;overflow-y:auto;padding:16px 18px 40px;box-shadow:-20px 0 40px rgba(0,0,0,.4)}.drawer.open{transform:none}
.drawer .dh{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px}.drawer .dh .id{font-family:var(--mono);color:var(--acc)}.drawer .x{background:none;border:1px solid var(--line2);color:var(--muted);border-radius:6px;padding:3px 9px;cursor:pointer}.drawer .x:hover{color:var(--fg);border-color:var(--acc)}
.drawer h3{font-size:16px;margin:0 0 12px;line-height:1.35}.drawer h5{margin:16px 0 6px;font-size:11px;letter-spacing:.7px;text-transform:uppercase;color:var(--muted)}.drawer .ac{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:8px 10px;margin-bottom:6px;font-size:12.5px}.drawer .ac b{color:var(--acc);font-weight:500;margin-right:4px}
.drawer .row{display:flex;gap:6px;flex-wrap:wrap}.drawer .link{cursor:pointer}.drawer .link:hover{border-color:var(--acc);color:var(--acc)}
.chain{display:flex;align-items:stretch;gap:0;overflow-x:auto;padding:4px 0}.cring{flex:1;min-width:170px;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 10px;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;position:relative;transition:border-color .15s}.cring:hover{border-color:var(--acc)}
.cring+.cring{margin-left:26px}.cring+.cring::before{content:'→';position:absolute;left:-22px;top:46%;color:var(--dim);font-size:18px}.cring svg{width:110px;height:110px}.cring .l{font-size:12.5px;color:var(--fg)}.cring .s{font-size:11.5px;color:var(--muted)}
.alert{display:flex;align-items:center;gap:12px;background:var(--warn-soft);border:1px solid rgba(250,178,25,.45);border-radius:10px;padding:10px 14px;margin-top:12px;cursor:pointer}.alert.ok{background:var(--good-soft);border-color:rgba(74,222,128,.35);cursor:default}.alert b{font-size:20px;color:var(--warn)}.alert.ok b{color:var(--good)}.alert .t{flex:1}.alert small{color:var(--muted)}
.canvas{position:fixed;inset:0;background:var(--bg);z-index:40;display:none;flex-direction:column}.canvas.open{display:flex}.canvas .ch{display:flex;align-items:center;gap:14px;padding:12px 20px;border-bottom:1px solid var(--line)}.canvas .ch h3{margin:0;font-size:16px}.canvas .ch .sp{flex:1}
.tabs{display:flex;gap:4px;border-bottom:1px solid var(--line);padding:0 20px}.tab{padding:10px 14px;cursor:pointer;color:var(--muted);border-bottom:2px solid transparent;font-size:13px}.tab.on{color:var(--fg);border-color:var(--acc)}.tab b{font-family:var(--mono);font-weight:500;margin-left:6px;color:var(--acc)}
.canvas .cb{flex:1;overflow-y:auto;padding:16px 20px 40px}.pane{display:none;max-width:1100px;margin:0 auto}.pane.on{display:block}
details.it{background:var(--card);border:1px solid var(--line);border-radius:8px;margin-bottom:8px}details.it summary{list-style:none;cursor:pointer;padding:10px 14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}details.it summary::before{content:'▸';color:var(--acc);font-size:12px}details.it[open] summary::before{content:'▾'}details.it .body{padding:0 14px 12px 32px;color:var(--muted);font-size:13px}details.it .body p{margin:6px 0;color:var(--fg)}
.tsec{font-size:11px;text-transform:uppercase;letter-spacing:.7px;color:var(--muted);margin:10px 0 4px;padding-bottom:3px;border-bottom:1px solid var(--line)}.tk{display:grid;grid-template-columns:22px 44px 1fr;gap:8px;align-items:start;padding:5px 0;border-bottom:1px dashed var(--line);font-size:13px;color:var(--fg)}.tk:last-child{border:0}
.tk .tkb{width:16px;height:16px;border:1.5px solid var(--line2);border-radius:4px;display:grid;place-items:center;font-size:11px;color:var(--good);margin-top:2px}.tk.done .tkb{border-color:var(--good);background:var(--good-soft)}.tk .n{font-family:var(--mono);font-size:11.5px;color:var(--muted);margin-top:2px}.tk .tx{line-height:1.5}.tk .tx code{background:var(--card2);border:1px solid var(--line);padding:0 5px;border-radius:4px;color:var(--acc)}
details.it .body code{background:var(--card2);border:1px solid var(--line);padding:0 5px;border-radius:4px;color:var(--acc)}.dc p code,.tl p code{background:var(--card2);border:1px solid var(--line);padding:0 4px;border-radius:4px;color:var(--acc)}
.expl{background:var(--card2);border-left:3px solid var(--warn);border-radius:6px;padding:10px 14px;margin-bottom:14px;font-size:13px;color:var(--fg)}
.work{display:flex;align-items:flex-start;overflow-x:auto;padding:14px 4px 4px}.wd{min-width:190px;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 12px;position:relative}.wd time{font-family:var(--mono);color:var(--acc);font-size:12px}.wd .k{margin-top:6px;display:flex;flex-direction:column;gap:2px;font-size:12px;color:var(--muted)}.wd .k b{color:var(--fg);font-weight:500;font-family:var(--mono);margin-right:4px}
.wgap{display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:90px;color:var(--dim);font-size:11px;font-family:var(--mono);position:relative}.wgap::before{content:'';position:absolute;left:0;right:0;top:50%;border-top:2px dashed var(--line2)}.wgap span{background:var(--bg);padding:0 6px;position:relative}
.stt{width:100%;border-collapse:collapse}.stt th,.stt td{padding:8px 10px;border-bottom:1px solid var(--line);text-align:right;font-variant-numeric:tabular-nums}.stt th:first-child,.stt td:first-child{text-align:left}.stt th{font-size:11px;text-transform:uppercase;letter-spacing:.6px;color:var(--muted)}
.empty{padding:30px;text-align:center;color:var(--muted);border:1px dashed var(--line2);border-radius:10px}footer{margin-top:40px;color:var(--dim);font-size:12px;font-family:var(--mono)}
</style></head><body>
<div id="app"></div>
<aside id="drawer" class="drawer"></aside>
<div id="canvas" class="canvas"></div>
<script id="data" type="application/json">${json}</script>
<script>
(function(){
const {model:M, ui:T, lang} = JSON.parse(document.getElementById('data').textContent);
const $ = (s, r=document) => r.querySelector(s);
const esc = (x) => String(x ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const key = (id) => String(id).replace(/[-_ ]/g,'').toUpperCase();
const cssEsc = (v) => (window.CSS && CSS.escape) ? CSS.escape(v) : String(v).replace(/["\\\\]/g, '\\\\$&');
const pct = (a,b) => b ? Math.round(a/b*100) : 0;
// Los textos de BMAD y de tasks.md traen markdown minimo: \`codigo\` y **negrita**. Se escapa primero.
const md = (x) => esc(x).replace(/\`([^\`]+)\`/g, '<code>$1</code>').replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>');
const m = M.metrics;

// ---- indices -------------------------------------------------------------
const reqRows = M.requirements.rows; const reqByKey = new Map(reqRows.map(r => [key(r.id), r]));
const stories = M.epics.flatMap(e => e.stories.map(s => ({...s, epic: e.n, epicTitle: e.title})));
const storyById = new Map(stories.map(s => [s.id, s]));
const specByStory = new Map(); for (const c of M.changes) { const cur = specByStory.get(c.story); if (!cur || c.revision > cur.revision || (c.revision===cur.revision && c.state==='archived')) specByStory.set(c.story, c); }
// requisito -> stories (desde epics.md, que trae el coverage map; no depende del trace)
const storiesByReq = new Map(); for (const s of stories) for (const r of s.requirements||[]) { const k = key(r); if (!storiesByReq.has(k)) storiesByReq.set(k, []); storiesByReq.get(k).push(s.id); }
const reqIdsInFlow = reqRows.length ? reqRows.filter(r => !r.removed && (r.group==='FR' || storiesByReq.has(key(r.id)))).map(r => r.id) : [...new Set(stories.flatMap(s => s.requirements||[]))];
const reqTextOf = (id) => reqByKey.get(key(id))?.text || '';
const reqChanges = (id) => reqByKey.get(key(id))?.changes ?? (M.decisions.ranking.find(r => key(r.id)===key(id))?.changes || 0);

// ---- header ----------------------------------------------------------------
function header(){
  const eng = M.engram.available ? (M.engram.project ? \`<span class="pill"><i class="dot"></i>\${T.engram} <b>\${esc(M.engram.project)}</b></span>\` : \`<span class="pill"><i class="dot warn"></i>\${T.engram} <b>\${T.unbound}</b></span>\`) : \`<span class="pill"><i class="dot off"></i>\${T.engram} <b>\${T.absent}</b></span>\`;
  const gr = M.graph.path ? \`<span class="pill"><i class="dot"></i>\${T.map} <b>\${M.graph.nodes} \${T.nodes}</b>\${M.graph.html?\` · <a href="../\${esc(M.graph.html)}">graph.html</a>\`:''}</span>\` : \`<span class="pill"><i class="dot off"></i>\${T.map}</span>\`;
  return \`<div class="top"><div class="logo"><i></i>un-specweaver</div><span class="pill"><b>\${esc(M.project.name)}</b></span><span class="sp"></span>
    \${M.project.agents.length?\`<span class="pill">\${esc(M.project.agents.join(', '))}</span>\`:''}\${eng}\${gr}<span class="pill mono">\${esc(M.generatedAt.slice(0,16).replace('T',' '))}</span></div>\`;
}

// ---- glosario ----------------------------------------------------------------
const glossary = () => \`<details class="gloss" open><summary><b>\${T.glossary}</b> — \${T.glossaryHint}</summary><div class="gloss-grid">\${T.gloss.map(([k,v]) => \`<div><b>\${esc(k)}</b>\${esc(v)}</div>\`).join('')}</div></details>\`;

// ---- hero ------------------------------------------------------------------
function ring(p, size=110, color='var(--acc)'){ const r = size*0.4, C = 2*Math.PI*r, c = size/2; return \`<svg viewBox="0 0 \${size} \${size}"><circle cx="\${c}" cy="\${c}" r="\${r}" fill="none" stroke="var(--line)" stroke-width="9"/><circle cx="\${c}" cy="\${c}" r="\${r}" fill="none" stroke="\${color}" stroke-width="9" stroke-linecap="round" stroke-dasharray="\${C}" stroke-dashoffset="\${C*(1-(p||0)/100)}" transform="rotate(-90 \${c} \${c})"/><text x="\${c}" y="\${c+8}" text-anchor="middle" fill="var(--fg)" font-size="\${size*0.22}" font-weight="700">\${p==null?'—':p+'%'}</text></svg>\`; }
function hero(){
  const rq = m.requirements; const sp = M.sprint;
  const cr = (k, p, l, sub) => \`<div class="cring" data-canvas="\${k}">\${ring(p)}<div class="l">\${l}</div><div class="s">\${sub}</div></div>\`;
  const chain = \`<div class="chain">
    \${cr('fr', rq.donePct, T.frDone, \`\${rq.done} \${T.of} \${rq.fr} · \${T.frDoneHint}\${rq.fr-rq.covered?\` · <span style="color:var(--warn)">\${rq.fr-rq.covered} \${T.noStory}</span>\`:''}\${rq.removed?\` · \${rq.removed} \${T.frRemoved}\`:''}\`)}
    \${cr('stories', m.storiesPct, T.storiesDoneShort, \`\${m.storiesDone} \${T.of} \${m.stories}\`)}
    \${cr('specs', pct(m.changes.archived, m.changes.total), T.specsDone, \`\${m.changes.archived} \${T.of} \${m.changes.total}\${m.changes.doneUnarchived?\` · <span style="color:var(--warn)">\${m.changes.doneUnarchived} \${T.unclosed}</span>\`:''}\`)}
    \${cr('tasks', m.tasksPct, T.tasksDone, \`\${m.tasks.done} \${T.of} \${m.tasks.total}\`)}
  </div>\`;
  const alert = rq.unstable ? \`<div class="alert" data-canvas="unstable"><b>\${rq.unstable}</b><div class="t">\${T.alertUnstable}<br><small>\${T.alertHint}</small></div><span class="tag warn">→</span></div>\` : \`<div class="alert ok"><b>✓</b><div class="t">\${T.alertNone}</div></div>\`;
  const tile = (v, l, sub) => \`<div class="tile"><div class="v">\${v}\${sub?\`<small>\${sub}</small>\`:''}</div><div class="l">\${l}</div></div>\`;
  const tiles = \`<div class="tiles" style="margin-top:12px">
    \${tile(sp&&sp.current?sp.current:'—', T.wave, sp?\`/ \${sp.waves.length} · \${sp.totals.ready} \${T.ready}\`:'')}
    \${tile(m.dates.activeDays||0, T.activeDays, m.dates.days!=null?\`· \${m.dates.days} \${T.days}\`:'')}
  </div>\`;
  return \`<section><h2>\${T.how}</h2><p class="hint">\${T.chainHint}</p>\${chain}\${alert}\${tiles}
  <div class="stepper">\${M.phases.map((p,i) => \`<div class="step \${p.done?'done':p.partial?'partial':''}"><span class="c">\${p.done?'✓':p.n}</span><span class="t">\${esc(T.phase[p.key])}</span>\${i<M.phases.length-1?'<span class="ln"></span>':''}</div>\`).join('')}</div></section>\`;
}

// ---- canvas a pantalla completa: completados / pendientes, con detalle plegable ---------
function canvasData(k){
  const item = (head, tags, body) => ({ head, tags, body });
  const storyLine = (sid) => { const st = storyById.get(sid); const c = specByStory.get(sid); return \`<span class="tag acc link" data-open="story:\${esc(sid)}">Story \${esc(sid)}</span> \${esc(st?.title||'')} <span class="st \${c?c.state:'missing'}">\${T.state[c?c.state:'missing']}</span>\`; };
  if (k==='fr') {
    const rows = reqRows.filter(r => r.group==='FR' && !r.removed);
    const removed = reqRows.filter(r => r.group==='FR' && r.removed);
    const mk = (r) => item(\`<b class="mono" style="color:var(--acc)">\${esc(r.id)}</b> <span>\${esc(r.text)}</span>\`,
      \`\${r.changes?\`<span class="tag \${r.changes>=3?'crit':'warn'}">\${r.changes} \${T.changesN}</span>\`:''}\${r.stories.length?\`<span class="tag">\${r.stories.length} \${T.stories}</span>\`:\`<span class="tag crit">\${T.frNoStory}</span>\`}\`,
      \`\${r.stories.length?r.stories.map(s => \`<p>\${storyLine(s)}</p>\`).join(''):\`<p>\${T.frNoStory}</p>\`}\`);
    const mkr = (r) => item(\`<b class="mono" style="color:var(--dim)"><s>\${esc(r.id)}</s></b> <span style="color:var(--muted)">\${esc(r.text)}</span>\`, \`<span class="tag dim">\${T.frRemoved}\${r.removedAt?\` · \${r.removedAt}\`:''}</span>\`, \`<p>\${T.frRemovedHint}</p>\`);
    return { title: T.canvasFR, done: rows.filter(r => r.done).map(mk), pending: rows.filter(r => !r.done).map(mk), removed: removed.map(mkr) };
  }
  if (k==='stories') {
    const mk = (s) => { const c = specByStory.get(s.id); return item(\`<b class="mono" style="color:var(--acc)">Story \${esc(s.id)}</b> <span>\${esc(s.title)}</span>\`,
      \`<span class="tag dim">Epic \${s.epic}</span><span class="st \${c?c.state:'missing'}">\${T.state[c?c.state:'missing']}</span>\${c&&c.state!=='archived'?\`<span class="tag">\${c.progress.done}/\${c.progress.total} \${T.tasksShort}</span>\`:''}\`,
      \`<p><b style="color:var(--acc);font-weight:500">\${T.role}</b> \${esc(s.role)}, <b style="color:var(--acc);font-weight:500">\${T.want}</b> \${esc(s.want)}</p><p>\${(s.requirements||[]).map(r => \`<span class="tag fr link" data-open="req:\${esc(r)}">\${esc(r)}</span>\`).join(' ')}</p>\${s.criteria.map(ac => \`<div class="ac">\${ac.given?\`<div><b>\${T.given}</b>\${esc(ac.given)}</div>\`:''}\${ac.when?\`<div><b>\${T.when}</b>\${esc(ac.when)}</div>\`:''}\${ac.then?\`<div><b>\${T.then}</b>\${esc(ac.then)}</div>\`:''}</div>\`).join('')}\`); };
    const isDone = (s) => { const c = specByStory.get(s.id); return c && (c.state==='done'||c.state==='archived'); };
    return { title: T.canvasStories, done: stories.filter(isDone).map(mk), pending: stories.filter(s => !isDone(s)).map(mk) };
  }
  if (k==='specs') {
    const mk = (c) => item(\`<b class="mono" style="color:var(--acc)">\${esc(c.id)}</b>\`, \`<span class="st \${c.state}">\${T.state[c.state]}\${c.archivedAt?\` · \${c.archivedAt}\`:''}</span>\${c.revision>1?\`<span class="tag crit">\${T.rev} \${c.revision}</span>\`:''}<span class="tag">\${c.progress.done}/\${c.progress.total} \${T.tasksShort}</span>\`,
      \`<p>\${storyLine(c.story)}</p><p><span class="tag dim">\${esc(c.capability||'')}</span></p>\`);
    return { title: T.canvasSpecs, done: M.changes.filter(c => c.state==='archived').map(mk), pending: M.changes.filter(c => c.state!=='archived').map(mk) };
  }
  if (k==='tasks') {
    const rows = (list) => { let sec = null; return list.map(t => { const h = t.section !== sec ? \`<div class="tsec">\${esc(t.section)}</div>\` : ''; sec = t.section; return h + \`<div class="tk \${t.done?'done':''}"><span class="tkb">\${t.done?'✓':''}</span><span class="n">\${esc(t.n)}</span><span class="tx">\${md(t.text)}</span></div>\`; }).join(''); };
    const groups = (pred) => M.changes.map(c => ({ c, t: c.tasks.filter(pred) })).filter(g => g.t.length).map(g => item(\`<b class="mono" style="color:var(--acc)">Story \${esc(g.c.story||'')}</b> <span>\${esc(g.c.title)}</span>\`, \`<span class="tag">\${g.t.length} \${T.tasksShort}</span>\`, rows(g.t)));
    return { title: T.canvasTasks, done: groups(t => t.done), pending: groups(t => !t.done) };
  }
  if (k==='unstable') {
    const rows = reqRows.filter(r => r.changes >= 2).sort((a,b) => b.changes-a.changes);
    const mk = (r) => { const ev = M.history[r.id] || []; return item(\`<b class="mono" style="color:var(--acc)">\${esc(r.id)}</b> <span>\${esc(r.text)}</span>\`, \`<span class="tag \${r.changes>=3?'crit':'warn'}">\${r.changes} \${T.changesN}</span>\${r.stories.length?\`<span class="tag">\${r.stories.length} \${T.stories}</span>\`:\`<span class="tag crit">\${T.frNoStory}</span>\`}\`,
      \`<ul class="tl">\${ev.map(e => \`<li class="t-\${esc(e.type)}"><div class="h"><time>\${esc(e.when||'—')}</time><span class="tag \${e.type==='override'||e.type==='modified'?'crit':e.type==='change'?'warn':'acc'}">\${esc(T.type[e.type]||e.type)}</span><span class="tag dim">\${esc(e.source)}</span></div><p>\${md(e.text)}</p></li>\`).join('')}</ul>\${r.stories.length?\`<p>\${T.affects}: \${r.stories.map(storyLine).join('<br>')}</p>\`:''}\`); };
    return { title: T.canvasUnstable, expl: T.alertWhy, done: [], pending: rows.map(mk), single: true };
  }
}
function openCanvas(k){
  const d = canvasData(k); if (!d) return; const c = $('#canvas');
  const list = (arr) => arr.length ? arr.map(i => \`<details class="it"><summary>\${i.head}<span class="sp" style="flex:1"></span>\${i.tags}</summary><div class="body">\${i.body}</div></details>\`).join('') : \`<div class="empty">—</div>\`;
  c.innerHTML = \`<div class="ch"><h3>\${esc(d.title)}</h3><span class="sp"></span><button class="x" data-close-canvas>\${T.close} (Esc)</button></div>
    \${d.single ? '' : \`<div class="tabs"><div class="tab on" data-tab="done">\${T.tabDone}<b>\${d.done.length}</b></div><div class="tab" data-tab="pending">\${T.tabPending}<b>\${d.pending.length}</b></div></div>\`}
    <div class="cb">\${d.expl?\`<div class="expl">\${esc(d.expl)}</div>\`:''}\${d.single ? \`<div class="pane on">\${list(d.pending)}</div>\` : \`<div class="pane on" data-pane="done">\${list(d.done)}</div><div class="pane" data-pane="pending">\${list(d.pending)}\${d.removed&&d.removed.length?\`<div class="grp"><h4>\${T.frRemoved} (\${d.removed.length})</h4>\${list(d.removed)}</div>\`:''}</div>\`}</div>\`;
  c.classList.add('open'); document.body.style.overflow = 'hidden';
}
function closeCanvas(){ $('#canvas').classList.remove('open'); document.body.style.overflow = ''; }

// ---- cuando se trabajo ----------------------------------------------------------
function workSec(){
  const days = m.activity || [];
  if (!days.length) return \`<section><h2>\${T.work}</h2><div class="empty">\${T.noHistory}</div></section>\`;
  const parts = [];
  days.forEach((d, i) => {
    if (i) { const gap = Math.round((new Date(d.date) - new Date(days[i-1].date))/86400000) - 1; parts.push(\`<div class="wgap"><span>\${gap>0?\`+\${gap} \${T.gap}\`:'→'}</span></div>\`); }
    const k = [];
    if (d.artifacts.length) k.push(\`<span><b>\${d.artifacts.length}</b>\${T.dayArt}: \${d.artifacts.map(a => T.kind[a]||a).join(', ')}</span>\`);
    if (d.decisions) k.push(\`<span><b>\${d.decisions}</b>\${T.dayDec}</span>\`); if (d.changes) k.push(\`<span><b>\${d.changes}</b>\${T.dayChg}</span>\`);
    if (d.bridge) k.push(\`<span><b>\${d.bridge}</b>\${T.dayBridge}</span>\`); if (d.archived) k.push(\`<span><b>\${d.archived}</b>\${T.dayArch}</span>\`);
    parts.push(\`<div class="wd"><time>\${esc(d.date)}</time><div class="k">\${k.join('')}</div></div>\`);
  });
  return \`<section><h2>\${T.work}</h2><p class="hint">\${T.workHint} \${m.dates.first?\`\${m.dates.first} → \${m.dates.last} · \${days.length} \${T.activeDays}\`:''}</p><div class="work">\${parts.join('')}</div></section>\`;
}

// ---- esfuerzo ----------------------------------------------------------------
function effort(){
  const kinds = ['briefs','prds','architecture','ux-designs','change-proposal'].filter(k => m.decisions.byKind[k]);
  const max = Math.max(1, ...kinds.map(k => m.decisions.byKind[k].entries));
  const rows = kinds.map(k => { const d = m.decisions.byKind[k]; const other = d.entries - d.decisions - d.changes - d.overrides - d.assumptions; const w = (n) => (n/max*100).toFixed(1)+'%';
    return \`<div class="erow"><span class="k">\${esc(T.kind[k]||k)}\${m.dates.phases[k]?\`<br><span class="mono" style="color:var(--dim)">\${m.dates.phases[k]}</span>\`:''}</span><div class="bars" title="\${d.entries} \${T.entries}"><i style="width:\${w(d.decisions)};background:var(--acc)"></i><i style="width:\${w(d.changes)};background:var(--warn)"></i><i style="width:\${w(d.overrides)};background:var(--crit)"></i><i style="width:\${w(d.assumptions)};background:var(--vio)"></i><i style="width:\${w(other)};background:var(--line2)"></i></div><span class="n">\${d.decisions} \${T.dec} · \${d.changes} \${T.chg}\${d.overrides?\` · \${d.overrides} \${T.ovr}\`:''}\${d.assumptions?\` · \${d.assumptions} \${T.asm}\`:''}</span></div>\`; }).join('');
  const f = (v,l) => \`<div class="fstep"><div class="v">\${v}</div><div class="l">\${l}</div></div>\`;
  return \`<section><h2>\${T.effort}</h2><p class="hint">\${T.effortHint}</p><div class="effort">
    <div class="card">\${rows || \`<div class="empty">\${T.noHistory}</div>\`}<div class="legend"><span><i style="background:var(--acc)"></i>\${T.dec}</span><span><i style="background:var(--warn)"></i>\${T.chg}</span><span><i style="background:var(--crit)"></i>\${T.ovr}</span><span><i style="background:var(--vio)"></i>\${T.asm}</span></div></div>
    <div class="card"><h4 style="margin:0 0 10px;font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.7px">\${T.funnel} — \${T.funnelHint}</h4><div class="funnel">\${f(m.requirements.total, T.req)}\${f(m.epics, T.epics)}\${f(m.stories, T.stories)}\${f(m.scenarios, T.criteria)}\${f(m.changes.total, T.specs)}\${f(m.tasks.total, T.tasksN)}</div></div>
  </div></section>\`;
}

// ---- flujo ----------------------------------------------------------------
function flow(){
  if (!stories.length && !reqIdsInFlow.length) return \`<section><h2>\${T.flow}</h2><div class="empty">\${T.empty}</div></section>\`;
  const reqB = reqIdsInFlow.map(id => { const n = reqChanges(id); const st = storiesByReq.get(key(id)) || []; return \`<div class="blk" data-k="req" data-id="\${esc(id)}"><div class="id"><span>\${esc(id)}</span>\${n?\`<span class="tag \${n>=3?'crit':'warn'}">\${n} \${T.changesN}</span>\`:''}</div><div class="tt">\${esc(reqTextOf(id)).slice(0,110)}</div><div class="meta">\${st.length?\`<span class="tag">\${st.length} \${T.stories}</span>\`:\`<span class="tag crit">\${T.noStory}</span>\`}</div></div>\`; }).join('');
  const epicB = M.epics.map(e => \`<div class="blk" data-k="epic" data-id="\${e.n}"><div class="id"><span>Epic \${e.n}</span><span class="tag">\${e.stories.length} \${T.stories}</span></div><div class="tt">\${esc(e.title)}</div></div>\`).join('');
  const storyB = stories.map(s => { const sp = specByStory.get(s.id); return \`<div class="blk" data-k="story" data-id="\${esc(s.id)}"><div class="id"><span>Story \${esc(s.id)}</span><span class="tag dim">Epic \${s.epic}</span></div><div class="tt">\${esc(s.title)}</div><div class="meta"><span class="tag">\${s.criteria.length} \${T.ac}</span>\${(s.requirements||[]).slice(0,4).map(r => \`<span class="tag fr">\${esc(r)}</span>\`).join('')}\${(s.requirements||[]).length>4?\`<span class="tag">+\${s.requirements.length-4}</span>\`:''}</div></div>\`; }).join('');
  const specB = stories.map(s => { const c = specByStory.get(s.id); if (!c) return \`<div class="blk" data-k="spec" data-id="\${esc(s.id)}" style="border-style:dashed"><div class="id"><span>Story \${esc(s.id)}</span></div><div class="meta"><span class="st missing">\${T.state.missing}</span></div></div>\`;
    return \`<div class="blk" data-k="spec" data-id="\${esc(s.id)}"><div class="id"><span>\${esc(c.id.length>34?c.id.slice(0,32)+'…':c.id)}</span>\${c.revision>1?\`<span class="tag crit">\${T.rev} \${c.revision}</span>\`:''}</div><div class="meta"><span class="st \${c.state}">\${T.state[c.state]}\${c.archivedAt?\` · \${c.archivedAt}\`:''}</span>\${c.state!=='archived'?\`<span class="tag">\${c.progress.done}/\${c.progress.total} \${T.tasksShort}</span>\`:''}</div>\${c.state!=='archived'?\`<div class="mini"><i style="width:\${pct(c.progress.done,c.progress.total)}%"></i></div>\`:''}</div>\`; }).join('');
  return \`<section><h2>\${T.flow}</h2><p class="hint">\${T.flowHint}</p><div class="flow" id="flow"><svg class="wires" id="wires"></svg><div class="cols">
    <div class="col"><h4>\${T.colReq}</h4>\${reqB}</div><div class="col"><h4>\${T.colEpic}</h4>\${epicB}</div><div class="col"><h4>\${T.colStory}</h4>\${storyB}</div><div class="col"><h4>\${T.colSpec}</h4>\${specB}</div>
  </div></div></section>\`;
}
// aristas: req->story, epic->story, story->spec
function edges(){
  const E = [];
  for (const s of stories) { for (const r of s.requirements||[]) if (reqIdsInFlow.some(x => key(x)===key(r))) E.push(['req', reqIdsInFlow.find(x => key(x)===key(r)), 'story', s.id]); E.push(['epic', String(s.epic), 'story', s.id]); E.push(['story', s.id, 'spec', s.id]); }
  return E;
}
function drawWires(lit){
  const flow = $('#flow'); const svg = $('#wires'); if (!flow || !svg) return;
  const fb = flow.getBoundingClientRect(); const box = (k,id) => { const el = flow.querySelector(\`.blk[data-k="\${k}"][data-id="\${cssEsc(id)}"]\`); if (!el) return null; const b = el.getBoundingClientRect(); return { x1: b.left-fb.left+flow.scrollLeft, x2: b.right-fb.left+flow.scrollLeft, y: b.top-fb.top+b.height/2+flow.scrollTop }; };
  svg.setAttribute('width', flow.scrollWidth); svg.setAttribute('height', flow.scrollHeight); svg.style.width = flow.scrollWidth+'px'; svg.style.height = flow.scrollHeight+'px';
  svg.innerHTML = edges().map(([ak,aid,bk,bid]) => { const a = box(ak,aid), b = box(bk,bid); if (!a||!b) return ''; const on = lit && lit.has(ak+':'+aid) && lit.has(bk+':'+bid); const mx = (a.x2+b.x1)/2; return \`<path class="\${on?'lit':''}" d="M\${a.x2} \${a.y} C \${mx} \${a.y}, \${mx} \${b.y}, \${b.x1} \${b.y}"/>\`; }).join('');
}
// camino conectado a un bloque
function related(k, id){
  const set = new Set([k+':'+id]);
  const addStory = (sid) => { const s = storyById.get(sid); if (!s) return; set.add('story:'+sid); set.add('spec:'+sid); set.add('epic:'+s.epic); for (const r of s.requirements||[]) { const rid = reqIdsInFlow.find(x => key(x)===key(r)); if (rid) set.add('req:'+rid); } };
  if (k==='req') for (const sid of storiesByReq.get(key(id))||[]) addStory(sid);
  if (k==='epic') for (const s of stories.filter(s => String(s.epic)===String(id))) addStory(s.id);
  if (k==='story'||k==='spec') addStory(id);
  return set;
}

// ---- memoria del proyecto: historial, decisiones clave, impactos, por etapa (pestañas) ----
function impactsBody(){
  if (!M.impacts.length) return \`<div class="empty">\${T.noImpacts}</div>\`;
  return \`<p class="hint">\${T.impactsHint}</p><div class="cards">\${M.impacts.map(e => \`<div class="dc \${e.type==='override'?'override':'constraint'}"><div class="h"><time>\${esc(e.when||'—')}</time><span class="tag \${e.type==='override'||e.type==='modified'?'crit':'warn'}">\${esc(T.type[e.type]||e.type)}</span><span class="tag dim">\${esc(T.kind[e.source]||e.source)}</span></div><p>\${esc(e.text)}</p>
    <div class="refs">\${e.refs.map(r => \`<span class="tag fr chip" data-open="req:\${esc(r)}">\${esc(r)}</span>\`).join('')}\${e.stories.length?\`<span class="tag dim">→ \${T.affects}</span>\`+e.stories.map(s => \`<span class="tag acc chip" data-open="story:\${esc(s)}">Story \${esc(s)}</span>\`).join(''):''}</div></div>\`).join('')}</div>\`;
}
function keyBody(){
  const groups = {}; for (const d of M.decisions.key) (groups[d.kind] = groups[d.kind] || []).push(d);
  const order = ['briefs','prds','architecture','ux-designs'];
  const body = order.filter(k => groups[k]).map(k => \`<div class="grp"><h4>\${esc(T.kind[k]||k)}</h4><div class="cards">\${groups[k].map(d => \`<div class="dc \${d.type}"><div class="h"><span class="tag \${d.type==='override'?'crit':d.type==='constraint'?'warn':d.type==='direction'?'vio':'acc'}">\${esc(T.type[d.type]||d.type)}</span>\${d.date?\`<time>\${esc(d.date)}</time>\`:''}</div><p>\${md(d.text)}</p>\${d.refs.length?\`<div class="refs">\${d.refs.map(r => \`<span class="tag fr chip" data-open="req:\${esc(r)}">\${esc(r)}</span>\`).join('')}</div>\`:''}</div>\`).join('')}</div></div>\`).join('');
  return \`<p class="hint">\${T.keyHint}</p>\${body || \`<div class="empty">\${T.noHistory}</div>\`}\`;
}
function historyBody(){
  const ev = [...M.timeline].sort((a,b) => String(a.when||'').localeCompare(String(b.when||'')));
  if (!ev.length) return \`<div class="empty">\${T.noHistory}</div>\`;
  let last = null; const items = [];
  for (const e of ev) { if (e.when !== last) { items.push(\`<li class="day">\${esc(e.when||'—')}</li>\`); last = e.when; }
    items.push(\`<li class="t-\${esc(e.type)}"><div class="h"><span class="tag \${e.type==='override'||e.type==='modified'?'crit':e.type==='change'?'warn':e.type==='archived'||e.type==='generated'?'fr':'acc'}">\${esc(T.type[e.type]||e.type)}</span><span class="tag dim">\${esc(T.kind[e.source]||e.source)}</span>\${(e.refs||[]).slice(0,6).map(r => /^Story /.test(r)?\`<span class="tag acc chip" data-open="story:\${esc(r.slice(6))}">\${esc(r)}</span>\`:\`<span class="tag fr chip" data-open="req:\${esc(r)}">\${esc(r)}</span>\`).join('')}</div><p>\${md(e.text)}</p><small>\${esc(e.file)}</small></li>\`); }
  return \`<p class="hint">\${T.historyHint}</p><div class="card"><ul class="tl">\${items.join('')}</ul></div>\`;
}
function statsBody(){
  const kinds = Object.keys(m.decisions.byKind); if (!kinds.length) return \`<div class="empty">\${T.noDecisions}</div>\`;
  const tot = { entries:0, decisions:0, changes:0, overrides:0, assumptions:0 };
  const rows = kinds.map(k => { const d = m.decisions.byKind[k]; for (const x in tot) tot[x] += d[x]; const other = d.entries-d.decisions-d.changes-d.overrides-d.assumptions; return \`<tr><td>\${esc(T.kind[k]||k)}\${m.dates.phases[k]?\` <span class="mono" style="color:var(--dim)">\${m.dates.phases[k]}</span>\`:''}</td><td>\${d.entries}</td><td>\${d.decisions}</td><td>\${d.changes}</td><td>\${d.overrides}</td><td>\${d.assumptions}</td><td>\${other}</td></tr>\`; }).join('');
  const other = tot.entries-tot.decisions-tot.changes-tot.overrides-tot.assumptions;
  return \`<div class="card"><table class="stt"><thead><tr><th>\${T.stKind}</th><th>\${T.stEntries}</th><th>\${T.stDec}</th><th>\${T.stChg}</th><th>\${T.stOvr}</th><th>\${T.stAsm}</th><th>\${T.stOther}</th></tr></thead><tbody>\${rows}<tr style="font-weight:600"><td>Total</td><td>\${tot.entries}</td><td>\${tot.decisions}</td><td>\${tot.changes}</td><td>\${tot.overrides}</td><td>\${tot.assumptions}</td><td>\${other}</td></tr></tbody></table></div>\`;
}
function memorySec(){
  const tabs = [['history', T.tabHistory, M.timeline.length], ['key', T.tabKey, M.decisions.key.length], ['impacts', T.tabImpacts, M.impacts.length], ['stats', T.tabStats, m.decisions.total]];
  return \`<section><h2>\${T.memory}</h2><div class="tabs" style="padding:0" data-tabs="mem">\${tabs.map(([k,l,n],i) => \`<div class="tab \${i?'':'on'}" data-tab="\${k}">\${l}<b>\${n}</b></div>\`).join('')}</div>
    <div class="pane on" data-pane="history" style="margin-top:14px">\${historyBody()}</div><div class="pane" data-pane="key" style="margin-top:14px">\${keyBody()}</div><div class="pane" data-pane="impacts" style="margin-top:14px">\${impactsBody()}</div><div class="pane" data-pane="stats" style="margin-top:14px">\${statsBody()}</div></section>\`;
}

// ---- drawer ----------------------------------------------------------------
function open(k, id){
  const d = $('#drawer'); let h = '';
  const chips = (arr, kind, pre='') => arr.map(x => \`<span class="tag \${kind==='req'?'fr':'acc'} link" data-open="\${kind}:\${esc(x)}">\${pre}\${esc(x)}</span>\`).join('');
  const hist = (rid) => { const ev = M.history[rid] || M.history[Object.keys(M.history).find(x => key(x)===key(rid))] || []; return ev.length ? \`<ul class="tl">\${ev.map(e => \`<li class="t-\${esc(e.type)}"><div class="h"><time>\${esc(e.when||'—')}</time><span class="tag \${e.type==='override'||e.type==='modified'?'crit':e.type==='change'?'warn':'acc'}">\${esc(T.type[e.type]||e.type)}</span><span class="tag dim">\${esc(e.source)}</span></div><p>\${esc(e.text)}</p></li>\`).join('')}</ul>\` : \`<p class="hint">\${T.noHist}</p>\`; };
  if (k==='req') { const r = reqByKey.get(key(id)); const st = storiesByReq.get(key(id))||[]; const n = reqChanges(id);
    h = \`<div class="dh"><span class="id">\${esc(id)}\${n?\` <span class="tag \${n>=3?'crit':'warn'}">\${n} \${T.changesN}</span>\`:''}</span><button class="x" data-close>\${T.close}</button></div><h3>\${esc(r?.text||'')}</h3>
      <h5>\${T.covers}</h5><div class="row">\${st.length?chips(st,'story','Story '):\`<span class="tag crit">\${T.noStory}</span>\`}</div><h5>\${T.reqHistory}</h5>\${hist(id)}\`; }
  if (k==='epic') { const e = M.epics.find(e => String(e.n)===String(id)); if (!e) return;
    h = \`<div class="dh"><span class="id">Epic \${e.n}</span><button class="x" data-close>\${T.close}</button></div><h3>\${esc(e.title)}</h3>\${e.goal?\`<h5>\${T.goal}</h5><p>\${esc(e.goal)}</p>\`:''}<h5>\${T.storiesOf}</h5><div class="row">\${chips(e.stories.map(s=>s.id),'story','Story ')}</div>\`; }
  if (k==='story'||k==='spec') { const s = storyById.get(id); if (!s) return; const c = specByStory.get(id);
    h = \`<div class="dh"><span class="id">Story \${esc(s.id)} <span class="tag dim">Epic \${s.epic}</span></span><button class="x" data-close>\${T.close}</button></div><h3>\${esc(s.title)}</h3>
      \${s.want?\`<p class="hint" style="color:var(--fg)"><b style="color:var(--acc);font-weight:500">\${T.role}</b> \${esc(s.role)}, <b style="color:var(--acc);font-weight:500">\${T.want}</b> \${esc(s.want)}\${s.benefit?\`, <b style="color:var(--acc);font-weight:500">\${T.benefit}</b> \${esc(s.benefit)}\`:''}</p>\`:''}
      <h5>\${T.epic}</h5><div class="row"><span class="tag acc link" data-open="epic:\${s.epic}">\${esc(s.epicTitle)}</span></div>
      <h5>\${T.reqOf}</h5><div class="row">\${(s.requirements||[]).length?chips(s.requirements,'req'):\`<span class="tag dim">—</span>\`}</div>
      <h5>\${T.spec}</h5>\${c?\`<div class="row"><code>\${esc(c.id)}</code> <span class="st \${c.state}">\${T.state[c.state]}\${c.archivedAt?\` · \${c.archivedAt}\`:''}</span>\${c.revision>1?\`<span class="tag crit">\${T.rev} \${c.revision}</span>\`:''}</div>\${c.state!=='archived'?\`<div class="bar" style="margin-top:8px"><i style="width:\${pct(c.progress.done,c.progress.total)}%"></i></div><p class="hint">\${T.progress}: \${c.progress.done}/\${c.progress.total} \${T.tasksShort}</p>\`:''}\`:\`<span class="tag crit">\${T.state.missing}</span>\`}
      <h5>\${T.criteriaOf} (\${s.criteria.length})</h5>\${s.criteria.map(ac => \`<div class="ac">\${ac.given?\`<div><b>\${T.given}</b>\${esc(ac.given)}</div>\`:''}\${ac.when?\`<div><b>\${T.when}</b>\${esc(ac.when)}</div>\`:''}\${ac.then?\`<div><b>\${T.then}</b>\${esc(ac.then)}</div>\`:''}\${(ac.and||[]).map(a => \`<div><b>\${T.and}</b>\${esc(a)}</div>\`).join('')}</div>\`).join('')}\`; }
  if (!h) return;
  d.innerHTML = h; d.classList.add('open');
  const flow = $('#flow'); if (flow) { const lit = related(k, id); flow.classList.add('focus'); flow.querySelectorAll('.blk').forEach(b => { const kk = b.dataset.k+':'+b.dataset.id; b.classList.toggle('lit', lit.has(kk) && kk!==k+':'+id); b.classList.toggle('sel', kk===k+':'+id); }); drawWires(lit);
    const el = flow.querySelector(\`.blk[data-k="\${k}"][data-id="\${cssEsc(id)}"]\`); if (el && !isVisible(el)) el.scrollIntoView({block:'center', behavior:'smooth'}); }
}
function isVisible(el){ const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }
function closeDrawer(){ $('#drawer').classList.remove('open'); const flow = $('#flow'); if (flow) { flow.classList.remove('focus'); flow.querySelectorAll('.blk').forEach(b => b.classList.remove('lit','sel')); drawWires(null); } }

// ---- render ------------------------------------------------------------------
$('#app').innerHTML = header() + \`<main>\${glossary()}\${hero()}\${workSec()}\${effort()}\${flow()}\${memorySec()}<footer>\${T.regen}</footer></main>\`;
drawWires(null); addEventListener('resize', () => drawWires(null));
document.addEventListener('click', (ev) => {
  const cv = ev.target.closest('[data-canvas]'); if (cv) { openCanvas(cv.dataset.canvas); return; }
  if (ev.target.closest('[data-close-canvas]')) { closeCanvas(); return; }
  const tab = ev.target.closest('.tab'); if (tab) { const bar = tab.parentElement; const scope = bar.closest('.canvas, section'); bar.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t===tab)); scope.querySelectorAll(':scope .pane[data-pane]').forEach(p => p.classList.toggle('on', p.dataset.pane===tab.dataset.tab)); return; }
  const o = ev.target.closest('[data-open]'); if (o) { const [k,...rest] = o.dataset.open.split(':'); open(k, rest.join(':')); return; }
  const b = ev.target.closest('.blk'); if (b) { open(b.dataset.k, b.dataset.id); return; } if (ev.target.closest('[data-close]')) closeDrawer(); });
document.addEventListener('keydown', (e) => { if (e.key==='Escape') { if ($('#canvas').classList.contains('open')) closeCanvas(); else closeDrawer(); } });
})();
</script>
</body></html>
`;
}
