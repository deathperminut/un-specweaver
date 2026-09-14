#!/usr/bin/env node
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { init, doctor } from '../src/init.mjs';
import { VENDORS } from '../src/env.mjs';

const pkg = createRequire(import.meta.url)('../package.json');

const HELP = `
un-specweaver ${pkg.version} — flujo de desarrollo dirigido por especificacion
  BMAD (planeacion) -> puente deterministico -> OpenSpec/SDD (ejecucion)

USO
  npx un-specweaver init [dir]        prepara el entorno completo en un proyecto
  npx un-specweaver doctor [dir]      revisa salud, pasos pendientes y drift de vendors
  npx un-specweaver bridge <epics.md> convierte stories de BMAD en changes de OpenSpec
  npx un-specweaver context        lista los artefactos de planeacion a cargar
  npx un-specweaver history [FR-21] historial de decisiones por requisito, o ranking de los que mas cambian
  npx un-specweaver status [dir]   en que va el proyecto: fases, changes, sprint, requisitos, decisiones
                                   --html escribe .un-specweaver/dashboard.html · --open lo abre · --json
  npx un-specweaver vendors           muestra las versiones pineadas

INIT
  --agents <ids>   agentes a configurar (default: autodetectados)
                   validos: ${Object.keys(VENDORS.agents).join(', ')}
  Preferencias del proyecto. Si se omiten y hay terminal, init las pregunta una vez y
  quedan en .un-specweaver/config.json. Los flags siempre mandan sobre lo guardado.

  --lang es|en                 idioma de comandos, documentos y mensajes
  --dry-run        imprime el plan exacto sin escribir ni ejecutar nada
  --yes            no pregunta antes de ejecutar el instalador remoto de Gentle-AI
  --force          rehace pasos que ya estaban hechos
  --keep-vendor-commands  conserva /sdd-* y /opsx:* (por defecto se ocultan)
  --prune-extra    poda tambien ${VENDORS.bmad.pruneOptional.join(', ')} (el SDD queda unico dueno de los tests)
  --only <ids>     corre solo estos pasos (coma-separados)
  --skip <ids>     omite estos pasos
  --keep-going     no se detiene en el primer paso que falle

QUE HACE INIT
  1. preflight: node >= 20.11, npx, curl, plataforma
  2. instala BMAD pineado, alcance del proyecto, solo el modulo de planeacion
  3. poda ${VENDORS.bmad.prune.join(', ')}
     (escriben codigo o compiten con OpenSpec; --no-shims evita los shims deprecados)
  4. inicializa OpenSpec
  5. instala y configura Gentle-AI (SDD + Engram) con alcance workspace
  6. segmenta la memoria de Engram por proyecto (.engram/config.json)
  7. instala graphify, la skill en el proyecto, .graphifyignore (solo codigo), el grafo AST y el hook
  8. escribe los comandos /sw:*, la skill un-specweaver y docs/architecture-base.md

  Todo queda dentro del proyecto. Nada se escribe en tu $HOME salvo el binario
  de Gentle-AI, que es una herramienta de sistema.
`;

function flags(argv) {
  const o = { _: [], lang: null, only: [], skip: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--agents') o.agents = argv[++i];
    else if (a === '--lang') o.lang = argv[++i];
    // Existio en 0.1.x. La memoria ahora es siempre por proyecto; se acepta para no romper
    // scripts, se avisa, y se ignora.
    else if (a === '--engram-scope') { argv[++i]; console.error('aviso: --engram-scope ya no existe, la memoria de Engram siempre se segmenta por proyecto'); }
    else if (a === '--graphify') { argv[++i]; console.error('aviso: --graphify ya no existe, el mapa del codigo es parte del metodo (usa --skip graphify-bin,graphify si no lo quieres)'); }
    else if (a === '--dry-run') o.dryRun = true;
    else if (a === '--yes' || a === '-y') o.yes = true;
    else if (a === '--force') o.force = true;
    else if (a === '--prune-extra') o.pruneExtra = true;
    else if (a === '--keep-vendor-commands') o.keepVendorCommands = true;
    else if (a === '--keep-going') o.keepGoing = true;
    else if (a === '--only') o.only = argv[++i].split(',').map((s) => s.trim());
    else if (a === '--skip') o.skip = argv[++i].split(',').map((s) => s.trim());
    else if (a === '--html') o.html = true;
    else if (a === '--open') { o.html = true; o.open = true; }
    else if (a === '--json') o.json = true;
    else if (a === '--help' || a === '-h') o.help = true;
    else if (a === '--version' || a === '-v') o.version = true;
    else if (a.startsWith('--')) { console.error(`Opcion desconocida: ${a}`); process.exit(2); }
    else o._.push(a);
  }
  return o;
}

const argv = process.argv.slice(2);
const cmd = argv[0]?.startsWith('-') ? null : argv[0];

// `bridge` reenvia sus argumentos verbatim: tiene sus propios flags (--strict, --only,
// --normative...) y parsearlos aqui hacia que rechazara los suyos. Va antes de flags().
if (cmd === 'bridge') {
  const cli = new URL('../bridge/cli.mjs', import.meta.url);
  const r = spawnSync(process.execPath, [cli.pathname, ...argv.slice(1)], { stdio: 'inherit' });
  process.exit(r.status ?? 1);
}

const o = flags(cmd ? argv.slice(1) : argv);

if (o.version) { console.log(pkg.version); process.exit(0); }
if (o.help || !cmd) { console.log(HELP); process.exit(cmd ? 0 : 1); }

switch (cmd) {
  case 'init':
    process.exit(await init({ ...o, dir: o._[0] }));

  case 'doctor':
    process.exit(doctor({ dir: o._[0], lang: o.lang }));

  case 'context': {
    // Los artefactos de planeacion viven en rutas fechadas y configurables. Que el agente
    // los adivine es como se pierden entre fases: aqui se listan.
    const { findPlanningArtifacts } = await import('../bridge/cli.mjs');
    const root = path.resolve(o._[0] || process.cwd());
    const found = findPlanningArtifacts(root);
    if (!found.length) { console.log('\nNo hay artefactos de planeacion todavia. Corre /sw:new.\n'); process.exit(0); }
    console.log('\nArtefactos de planeacion — cargalos antes de diseñar o construir:\n');
    let last = null;
    for (const a of found) {
      if (a.kind !== last) { console.log(`  ${a.kind}  (${a.what})`); last = a.kind; }
      console.log(`    ${path.relative(root, a.file)}`);
    }
    console.log('');
    process.exit(0);
  }

  case 'history': {
    // Las decisiones que BMAD registro en las conversaciones (.memlog.md, sprint-change-proposal)
    // y lo que hizo el puente (changelog.jsonl), por requisito. Vista derivada: no guarda nada.
    const { planningRoot } = await import('../bridge/cli.mjs');
    const { requirementHistory, instabilityRanking, collectDecisions } = await import('../bridge/decisions.mjs');
    const root = path.resolve(process.cwd());
    const pr = planningRoot(root);
    let trace = null;
    try { trace = JSON.parse((await import('node:fs')).readFileSync(path.join(root, '.un-specweaver', 'trace.json'), 'utf8')); } catch { /* sin puente aun */ }
    const id = o._[0];
    if (!id) {
      const { sources, entries } = collectDecisions(root, pr);
      if (!sources.length) { console.log('\nNo hay memlogs ni propuestas de cambio todavia. Aparecen con /sw:new (BMAD los escribe al conversar).\n'); process.exit(0); }
      console.log(`\n${entries.length} decision(es) en ${sources.length} fuente(s). Requisitos que mas han cambiado despues de nacer:\n`);
      const rows = instabilityRanking(root, pr, trace);
      if (!rows.length) console.log('  (ninguna entrada cita un requisito por id)');
      for (const r of rows.slice(0, 15)) console.log(`  ${r.id.padEnd(9)} ${String(r.changes).padStart(2)} cambio(s)  ${String(r.mentions).padStart(2)} mencion(es)  ${r.stories.length ? `stories ${r.stories.join(', ')}` : ''}${r.last ? `  ultimo ${r.last}` : ''}`);
      console.log('\n  npx un-specweaver history <id> para ver el detalle de uno.\n');
      process.exit(0);
    }
    const h = requirementHistory(root, pr, id, trace);
    if (!h.events.length) { console.log(`\n${id}: sin decisiones registradas que lo citen${h.stories.length ? ` (lo cubren las stories ${h.stories.join(', ')})` : ''}.\n`); process.exit(0); }
    console.log(`\n${h.id} — ${h.changes} cambio(s) en ${h.events.length} evento(s)${h.stories.length ? `; stories ${h.stories.join(', ')}` : ''}\n`);
    for (const e of h.events) console.log(`  ${(e.when || '????-??-??').padEnd(10)} ${e.source.padEnd(22)} (${e.type}) ${e.text}\n             ${e.file}`);
    console.log('');
    process.exit(0);
  }

  case 'status': {
    // Vista derivada de lo que ya esta en disco. No guarda estado: el HTML es regenerable
    // y va al .gitignore, igual que graph.html de graphify.
    const { collectStatus } = await import('../src/status/collect.mjs');
    const { renderTerminal, renderHtml } = await import('../src/status/render.mjs');
    const root = path.resolve(o._[0] || process.cwd());
    const model = collectStatus(root);
    const lang = o.lang || model.project.lang;
    if (o.json) { console.log(JSON.stringify(model, null, 2)); process.exit(0); }
    if (o.html) {
      const fs = await import('node:fs');
      const out = path.join(root, '.un-specweaver', 'dashboard.html');
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, renderHtml(model, lang), 'utf8');
      console.log(`${path.relative(root, out)} (${fs.statSync(out).size} bytes)`);
      if (o.open) {
        const opener = process.platform === 'darwin' ? 'open' : 'xdg-open';
        spawnSync(opener, [out], { stdio: 'ignore' });
      }
      process.exit(0);
    }
    console.log(renderTerminal(model, lang));
    process.exit(0);
  }

  case 'vendors':
    console.log(`\nversiones pineadas (${path.basename(new URL('../src/vendors.json', import.meta.url).pathname)})\n`);
    console.log(`  bmad      ${VENDORS.bmad.npm}@${VENDORS.bmad.version}   modulos: ${VENDORS.bmad.modules}   podado: ${VENDORS.bmad.prune.join(', ')}`);
    console.log(`  openspec  ${VENDORS.openspec.npm}@${VENDORS.openspec.version}`);
    console.log(`  gentle    ${VENDORS.gentle.bin} ${VENDORS.gentle.version}`);
    console.log(`  graphify  ${VENDORS.graphify.pip}@${VENDORS.graphify.version}   solo codigo (${VENDORS.graphify.ignoreFile})`);
    console.log(`\n  Para subir un vendor: edita src/vendors.json, publica, y "un-specweaver doctor" reporta el drift.\n`);
    process.exit(0);

  default:
    console.error(`Comando desconocido: ${cmd}\n${HELP}`);
    process.exit(2);
}
