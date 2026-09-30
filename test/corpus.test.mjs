import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateCorpus } from '../scripts/validate.mjs';
import { build, checkInternalLinks, toCsv } from '../scripts/build.mjs';

const load = async () => JSON.parse(await readFile(new URL('../content/reperes.json', import.meta.url), 'utf8'));

test('le corpus livré est valide', async () => {
  const { errors } = validateCorpus(await load());
  assert.deepEqual(errors, []);
});

test('une source citée mais absente est détectée', async () => {
  const d = await load();
  d.events[0].sources.push('inexistante');
  assert.ok(validateCorpus(d).errors.some(e => e.includes('source inconnue « inexistante »')));
});

test('un identifiant en double est détecté', async () => {
  const d = await load();
  d.sources.push({ ...d.sources[0] });
  assert.ok(validateCorpus(d).errors.some(e => e.includes('identifiant en double')));
});

test('un terme, un acteur ou un fil inconnu est détecté', async () => {
  const d = await load();
  d.events[0].terms.push('mot-absent');
  d.events[0].actors.push('acteur-absent');
  d.events[0].threads.push('fil-absent');
  const { errors } = validateCorpus(d);
  assert.ok(errors.some(e => e.includes('terme inconnu')));
  assert.ok(errors.some(e => e.includes('acteur inconnu')));
  assert.ok(errors.some(e => e.includes('fil inconnu')));
});

test('un document rattaché à un repère absent est détecté', async () => {
  const d = await load();
  d.documents['repere-absent'] = d.documents['resolution-2016'];
  assert.ok(validateCorpus(d).errors.some(e => e.includes('aucun événement')));
});

test('les tirets cadratins sont refusés', async () => {
  const d = await load();
  d.events[0].text += ' \u2014 ajout';
  assert.ok(validateCorpus(d).errors.some(e => e.includes('tiret cadratin')));
});

test('un statut éditorial non prévu est refusé', async () => {
  const d = await load();
  d.editorial_status = 'validated';
  assert.ok(validateCorpus(d).errors.some(e => e.includes('editorial_status')));
});

test('le CSV reprend chaque événement et échappe les guillemets', async () => {
  const d = await load();
  const csv = toCsv(d).trim().split('\n');
  assert.equal(csv.length, d.events.length + 1);
  assert.match(toCsv({ ...d, events: [{ ...d.events[0], text: 'a "b", c' }] }), /"a ""b"", c"/);
});

test('les liens internes cassés sont signalés', async () => {
  const d = await load();
  const html = '<a href="#/parcours/absent"></a><a href="#/inconnue"></a><a href="#/voix/nulle-part"></a>';
  const errors = await checkInternalLinks(html, d, tmpdir());
  assert.equal(errors.length, 3);
});

test('le build produit une page cohérente avec le corpus', async () => {
  const out = await mkdtemp(join(tmpdir(), 'reperes-'));
  try {
    const { html, corpus } = await build({ outDir: out, quiet: true });
    assert.doesNotMatch(html, /{{[A-Z_]+}}/);
    assert.match(html, /class="status-banner"[\s\S]*?aucune relecture indépendante/);
    assert.match(html, /<code>draft_pending_independent_review<\/code>/);
    assert.doesNotMatch(html, /unpkg\.com|fonts\.googleapis|fonts\.gstatic/);
    const served = JSON.parse(await readFile(join(out, 'data/reperes.json'), 'utf8'));
    assert.deepEqual(served, corpus);
    const inline = html.match(/<script type="application\/json" id="corpus">([\s\S]*?)<\/script>/)[1];
    assert.deepEqual(JSON.parse(inline), corpus);
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});
