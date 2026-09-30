// Construit dist/ à partir de src/ et du corpus unique content/reperes.json.
// Usage : node scripts/build.mjs [--out dist]
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, rm, writeFile, access } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validateCorpus } from './validate.mjs';
import { GEO_SHA256, loadGeo, miniSvg, regionSvg } from './map.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROUTES = ['parcours', 'voix', 'verifier', 'mots', 'methode'];

const hash = text => createHash('sha256').update(text).digest('hex').slice(0, 10);

// Le nombre de notices s'écrit en lettres dans la page. Au-delà de la table, le build échoue plutôt que d'afficher un chiffre faux.
const NUMBER_WORDS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize'];
export function countWord(n) {
  if (!NUMBER_WORDS[n]) throw new Error(`nombre de repères sans équivalent en lettres : ${n} (compléter NUMBER_WORDS)`);
  return NUMBER_WORDS[n];
}

export function toCsv(corpus) {
  const cell = v => {
    const s = String(v ?? '');
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ['id', 'year', 'title', 'text', 'context', 'source_ids', 'threads', 'places', 'editorial_status', 'license'];
  const rows = corpus.events.map(e => [
    e.id, e.year, e.title, e.text, e.context, e.sources.join('|'), e.threads.join('|'), e.places.join('|'),
    corpus.editorial_status, corpus.license.notices,
  ]);
  return [header, ...rows].map(r => r.map(cell).join(',')).join('\n') + '\n';
}

export function tokensFromCss(css) {
  const root = css.match(/:root\s*{([\s\S]*?)}/);
  if (!root) throw new Error('tokens.css : bloc :root introuvable');
  const tokens = {};
  for (const m of root[1].matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)) tokens[m[1]] = m[2].trim();
  return tokens;
}

function formatDateFr(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

// Vérifie les liens internes (#/route/param) et les fichiers relatifs référencés par la page.
export async function checkInternalLinks(html, corpus, outDir) {
  const errors = [];
  const eventIds = new Set(corpus.events.map(e => e.id));
  const actorIds = new Set(Object.keys(corpus.actors));
  for (const [, href] of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    if (/^(https?:|mailto:)/.test(href)) continue;
    if (href.startsWith('#')) {
      if (href === '#contenu' || href === '#/' || href === '#') continue;
      const [route, param] = href.replace(/^#\/?/, '').split('/');
      if (!ROUTES.includes(route)) errors.push(`lien interne vers une route inconnue : ${href}`);
      else if (route === 'parcours' && param && !eventIds.has(param)) errors.push(`lien vers un repère inconnu : ${href}`);
      else if (route === 'voix' && param && !actorIds.has(param)) errors.push(`lien vers un acteur inconnu : ${href}`);
      continue;
    }
    const file = href.split(/[?#]/)[0];
    try { await access(join(outDir, file)); } catch { errors.push(`fichier référencé absent de dist : ${file}`); }
  }
  return errors;
}

export async function build({ outDir = join(ROOT, 'dist'), quiet = false } = {}) {
  const log = (...a) => { if (!quiet) console.log(...a); };
  const pkg = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'));
  const corpusText = await readFile(join(ROOT, 'content/reperes.json'), 'utf8');
  const corpus = JSON.parse(corpusText);

  const template = await readFile(join(ROOT, 'src/index.html'), 'utf8');
  const externalRefs = [...template.matchAll(/data-source="([^"]+)"/g)].map(m => m[1]);
  const { errors, warnings } = validateCorpus(corpus, { externalRefs });
  warnings.forEach(w => log(`avertissement : ${w}`));
  if (errors.length) throw new Error(`corpus invalide :\n- ${errors.join('\n- ')}`);

  await rm(outDir, { recursive: true, force: true });
  await mkdir(join(outDir, 'data'), { recursive: true });
  await mkdir(join(outDir, 'design-system'), { recursive: true });
  await cp(join(ROOT, 'src/fonts'), join(outDir, 'fonts'), { recursive: true });
  await cp(join(ROOT, 'src/styles'), join(outDir, 'styles'), { recursive: true });
  await cp(join(ROOT, 'src/favicon.svg'), join(outDir, 'favicon.svg'));
  const app = await readFile(join(ROOT, 'src/app.js'), 'utf8');
  await writeFile(join(outDir, 'app.js'), app);

  // Exports téléchargeables : tous dérivés du même fichier.
  await writeFile(join(outDir, 'data/reperes.json'), corpusText);
  await writeFile(join(outDir, 'data/reperes-evenements.csv'), toCsv(corpus));
  await cp(join(ROOT, 'content/charte-editoriale.md'), join(outDir, 'data/charte-editoriale.md'));

  const tokensCss = await readFile(join(ROOT, 'src/styles/tokens.css'), 'utf8');
  const siteCss = await readFile(join(ROOT, 'src/styles/site.css'), 'utf8');
  const tokensJson = { version: pkg.version, source: 'src/styles/tokens.css', tokens: tokensFromCss(tokensCss) };
  await writeFile(join(outDir, 'design-system/tokens.json'), JSON.stringify(tokensJson, null, 2) + '\n');

  const geo = await loadGeo();
  const words = countWord(corpus.events.length);
  const collations = Object.values(corpus.documents || {}).map(d => d.collation?.checked_on).filter(Boolean).sort();
  // « < » échappé pour qu'aucune chaîne du corpus ne puisse fermer la balise script.
  const inlineCorpus = `<script type="application/json" id="corpus">${JSON.stringify(corpus).replace(/</g, '\\u003c')}</script>`;
  const replacements = {
    VERSION: pkg.version,
    EDITORIAL_STATUS: corpus.editorial_status,
    SCHEMA_VERSION: corpus.schema_version,
    COLLATION_DATE: collations.length ? formatDateFr(collations.at(-1)) : 'date non renseignée',
    HASH_TOKENS: hash(tokensCss),
    HASH_SITE: hash(siteCss),
    HASH_APP: hash(app),
    CORPUS: inlineCorpus,
    EVENT_COUNT_WORD: words,
    EVENT_COUNT_WORD_CAP: words[0].toUpperCase() + words.slice(1),
    FIRST_YEAR: corpus.events[0].year,
    LAST_YEAR: corpus.events.at(-1).year,
    GEO_SHA256,
    MAP_REGION: regionSvg(geo),
    MAP_MINI: miniSvg(geo),
  };
  const html = template.replace(/{{([A-Z_]+)}}/g, (m, key) => {
    if (!(key in replacements)) throw new Error(`index.html : variable inconnue ${m}`);
    return replacements[key];
  });
  await writeFile(join(outDir, 'index.html'), html);

  const linkErrors = await checkInternalLinks(html, corpus, outDir);
  if (linkErrors.length) throw new Error(`liens internes cassés :\n- ${linkErrors.join('\n- ')}`);

  log(`dist/ construit : version ${pkg.version}, ${corpus.events.length} repères, ${corpus.sources.length} sources.`);
  return { outDir, corpus, html };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const i = process.argv.indexOf('--out');
  const outDir = i > -1 ? resolve(process.argv[i + 1]) : undefined;
  build({ outDir }).catch(e => { console.error(e.message); process.exit(1); });
}
