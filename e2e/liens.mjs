// Usage : docker compose run --rm --no-deps -e E2E_SCRIPT=liens.mjs e2e
// Ouvre chaque source du corpus dans Chromium : utile pour les sites qui refusent les clients sans JavaScript.
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
const corpus = JSON.parse(await readFile('/app/content/reperes.json', 'utf8'));
const browser = await chromium.launch();
const page = await browser.newPage({ locale: 'fr-FR', userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36' });
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
let failures = 0;
for (const s of corpus.sources.filter(x => !only || only.includes(x.id))) {
  try {
    const res = await page.goto(s.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(4000);
    const title = (await page.title()).slice(0, 90);
    const ok = res && res.status() < 400 && !/challenge|captcha|just a moment/i.test(title);
    if (!ok) failures++;
    console.log(`${ok ? 'ok  ' : 'ÉCHEC'} ${res?.status()} ${s.id} → ${page.url()} « ${title} »`);
  } catch (e) { failures++; console.log(`ÉCHEC --- ${s.id} ${e.message.split('\n')[0]}`); }
}
await browser.close();
process.exit(failures ? 1 : 0);
