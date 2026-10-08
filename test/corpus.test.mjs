import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LOOSE_SPACE, validateCorpus } from '../scripts/validate.mjs';
import { build, checkInternalLinks, countWord, toCsv } from '../scripts/build.mjs';
import { decode, loadGeo, miniSvg, regionSvg } from '../scripts/map.mjs';

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

test('une décision mal rattachée ou mal classée est détectée', async () => {
  const d = await load();
  d.decisions[0].event = 'repere-absent';
  d.decisions[1].when = '2030-01-01';
  const { errors } = validateCorpus(d);
  assert.ok(errors.some(e => e.includes('repère inconnu « repere-absent »')));
  assert.ok(errors.some(e => e.includes('classées par date')));
});

test('les tirets cadratins sont refusés', async () => {
  const d = await load();
  d.events[0].text += ' \u2014 ajout';
  assert.ok(validateCorpus(d).errors.some(e => e.includes('tiret cadratin')));
});

test('une espace normale avant « : » est refusée, dans le corpus comme dans le gabarit', async () => {
  const d = await load();
  d.events[0].question = 'Pourquoi ?';
  assert.ok(validateCorpus(d).errors.some(e => e.includes('espace normale')));
  const html = await readFile(new URL('../src/index.html', import.meta.url), 'utf8');
  const text = html.replace(/<script[\s\S]*?<\/script>|<svg[\s\S]*?<\/svg>|<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, '');
  assert.ok(!text.split('\n').some(l => LOOSE_SPACE.test(l)), 'gabarit : espace normale avant une ponctuation double');
});

test('un statut éditorial non prévu est refusé', async () => {
  const d = await load();
  d.editorial_status = 'validated';
  assert.ok(validateCorpus(d).errors.some(e => e.includes('editorial_status')));
});

test('un lieu inconnu ou une zone de carte inconnue est détecté', async () => {
  const d = await load();
  d.events[2].places.push('lieu-absent');
  d.places[0].map_zone = 'jerusalem-est';
  const { errors } = validateCorpus(d);
  assert.ok(errors.some(e => e.includes('lieu inconnu « lieu-absent »')));
  assert.ok(errors.some(e => e.includes('zone de carte inconnue')));
});

test('chaque notice reste accessible : située sur la carte ou listée hors carte', async () => {
  const d = await load();
  const mapped = new Set(d.places.filter(p => p.map_zone).map(p => p.id));
  for (const e of d.events) {
    assert.ok(e.places.some(p => mapped.has(p)) || e.places.length === 0, e.id);
  }
});

test('le nombre de repères s’écrit en lettres, sinon le build échoue', () => {
  assert.equal(countWord(7), 'sept');
  assert.throws(() => countWord(40), /NUMBER_WORDS/);
});

test('la géométrie sépare Gaza et la Cisjordanie', async () => {
  const geo = await loadGeo();
  assert.equal(geo.zones.gaza.length, 1);
  assert.equal(geo.zones.cisjordanie.length, 1);
  assert.ok(!geo.countries.some(c => c.name === 'Palestine'));
  const region = regionSvg(geo);
  assert.match(region, /data-zone="gaza"[^>]*data-place="gaza"/);
  assert.match(region, /data-zone="cisjordanie"/);
  assert.doesNotMatch(region, /J[ée]rusalem/, 'aucun point Jérusalem : le contour ne distingue pas Jérusalem-Est');
  assert.doesNotMatch(region + miniSvg(geo), /\sstyle=/);
});

test('une géométrie inattendue arrête le build', () => {
  const topo = { transform: { scale: [1, 1], translate: [0, 0] }, arcs: [[[30, 30], [1, 0], [0, 1], [-1, -1]]], objects: { countries: { geometries: [
    { type: 'Polygon', arcs: [[0]], properties: { name: 'Palestine' } },
  ] } } };
  assert.throws(() => decode(topo), /zone gaza/);
});

test('chaque source d’un repère est appelée dans le texte, et seulement elles', async () => {
  const d = await load();
  const e = d.events.find(x => x.id === 'guerre-1967');
  e.text = e.text.replace('[[histoire]]', '[[absente]]');
  const { errors } = validateCorpus(d);
  assert.ok(errors.some(x => x.includes('[[absente]]')));
  assert.ok(errors.some(x => x.includes('« histoire » jamais appelée')));
});

test('un passage en anglais est marqué et la marque est fermée', async () => {
  const d = await load();
  d.terms[0].text += ' {en}not closed';
  d.sources[0].lang = 'klingon';
  const { errors } = validateCorpus(d);
  assert.ok(errors.some(x => x.includes('marque de langue mal fermée')));
  assert.ok(errors.some(x => x.includes('langue du titre inconnue')));
  const csv = toCsv(await load());
  assert.doesNotMatch(csv, /\{\/?en\}|\[\[/);
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
    assert.doesNotMatch(html, /{{[A-Z0-9_]+}}/);
    assert.match(html, /class="map-method__hash">[0-9a-f]{64}</);
    assert.match(html, /<meta property="og:image" content="https:\/\/reperes-gaza\.fr\/og-image\.png">/);
    assert.doesNotMatch(html, /aucune relecture indépendante|en attente de relecture/, 'la relecture éditoriale a eu lieu');
    assert.doesNotMatch(html, /unpkg\.com|jsdelivr|fonts\.googleapis|fonts\.gstatic/);
    assert.match(html, /<h1 id="home-title"[^>]*>Comprendre le rôle de la France <span class="accent-on-ink">dans la question de Gaza<\/span><\/h1>/);
    assert.match(html, /Huit repères, de 1948 à 2025&nbsp;: des décisions françaises, et le contexte qui les éclaire\./);
    assert.match(html, /href="#\/parcours\/nakba-1948">Lire le premier repère/);
    assert.match(html, /class="map map--light map--region"/);
    assert.match(html, /<template id="map-mini"><svg class="map map--light"/);
    assert.doesNotMatch(html.replace(/<script type="application\/json" id="corpus">[\s\S]*?<\/script>/, ''), /\sstyle="/, 'la CSP interdit les attributs style');
    const served = JSON.parse(await readFile(join(out, 'data/reperes.json'), 'utf8'));
    assert.deepEqual(served, corpus);
    const inline = html.match(/<script type="application\/json" id="corpus">([\s\S]*?)<\/script>/)[1];
    assert.deepEqual(JSON.parse(inline), corpus);
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});
