// Captures des pages de rubrique (relecture visuelle). Usage : docker compose run --rm -e E2E_SCRIPT=apercu.mjs e2e
import { chromium } from 'playwright';
const BASE = (process.env.BASE_URL || 'http://site:8080').replace(/\/$/, '');
const SHOTS = process.env.SHOTS_DIR || '/app/e2e/screenshots';
const b = await chromium.launch();
for (const [w, h, tag] of [[1366, 900, 'desktop'], [390, 844, 'mobile']]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  for (const r of ['verifier', 'voix/israel', 'mots', 'methode']) {
    await p.goto(`${BASE}/#/${r}`); await p.waitForTimeout(400);
    await p.screenshot({ path: `${SHOTS}/${tag}-${r.replace('/', '-')}.png`, fullPage: true });
  }
  await p.close();
}
await b.close();
