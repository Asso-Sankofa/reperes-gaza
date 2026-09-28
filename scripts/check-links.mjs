// Contrôle réseau des liens sortants du corpus. Ne fait pas partie du build (dépend du réseau).
// Un code 200 ne prouve pas que le passage cité est toujours là : ce contrôle repère les liens morts,
// il ne remplace pas une relecture de la source.
// Usage : node scripts/check-links.mjs
import { readFile } from 'node:fs/promises';

const corpus = JSON.parse(await readFile(new URL('../content/reperes.json', import.meta.url), 'utf8'));
const UA = 'Mozilla/5.0 (compatible; reperes-link-check/1.0)';
// Pages de défi anti-robot : le lien existe peut-être, mais seul un navigateur peut le confirmer.
const CHALLENGE = /Client Challenge|enable JavaScript|cf-chl|captcha/i;

let failures = 0;
for (const s of corpus.sources) {
  let line;
  try {
    const res = await fetch(s.url, { redirect: 'follow', headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) });
    const body = await res.text();
    const note = CHALLENGE.test(body) ? ' (défi anti-robot : vérifier dans un navigateur)' : '';
    const moved = res.url !== s.url ? ` → ${res.url}` : '';
    if (!res.ok) failures++;
    line = `${res.ok ? 'ok  ' : 'ÉCHEC'} ${res.status} ${s.id}${moved}${note}`;
  } catch (e) {
    failures++;
    line = `ÉCHEC --- ${s.id} ${e.name}: ${e.message}`;
  }
  console.log(line);
}
console.log(failures ? `\n${failures} lien(s) en échec.` : '\nTous les liens répondent.');
process.exit(failures ? 1 : 0);
