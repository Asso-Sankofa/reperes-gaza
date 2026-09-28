// Vérification des principaux parcours dans Chromium (Playwright), sur ordinateur et en largeur mobile.
// Lancé par `docker compose run --rm e2e`. BASE_URL désigne le site à tester (local ou déployé).
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = (process.env.BASE_URL || 'http://site:8080').replace(/\/$/, '');
const SHOTS = process.env.SHOTS_DIR || '/app/e2e/screenshots';
await mkdir(SHOTS, { recursive: true });

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok });
  console.log(`${ok ? 'ok  ' : 'ÉCHEC'} ${name}${detail ? ` (${detail})` : ''}`);
}

const browser = await chromium.launch();

async function newPage(viewport, extra = {}) {
  const context = await browser.newContext({ viewport, locale: 'fr-FR', ...extra });
  const page = await context.newPage();
  const baseHost = new URL(BASE).host;
  page.external = [];
  page.errors = [];
  page.on('request', r => { const u = new URL(r.url()); if (u.host !== baseHost && !u.protocol.startsWith('data')) page.external.push(r.url()); });
  page.on('pageerror', e => page.errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') page.errors.push(m.text()); });
  return page;
}
const hash = page => page.evaluate(() => location.hash);
const focused = page => page.evaluate(() => {
  const a = document.activeElement;
  return a ? (a.id || a.dataset.focus || a.textContent.trim().slice(0, 40)) : null;
});
const noHorizontalScroll = page => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

/* ---------- Ordinateur ---------- */
{
  const page = await newPage({ width: 1366, height: 900 });
  await page.goto(BASE + '/');
  await page.waitForSelector('#home-title');
  check('accueil : titre affiché', await page.locator('#home-title').isVisible());
  check('accueil : statut éditorial visible', await page.getByText('draft_pending_independent_review').first().isVisible());
  check('accueil : six questions', (await page.locator('.question-card').count()) === 6);
  check('accueil : frise avec sept repères', (await page.locator('[data-slot="home-rail"] .rail__dot').count()) === 7);
  check('accueil : polices chargées localement', await page.evaluate(async () => { await document.fonts.ready; return document.fonts.check('16px "DM Sans"') && document.fonts.check('16px "Libre Caslon Display"'); }));
  await page.screenshot({ path: `${SHOTS}/desktop-accueil.png`, fullPage: true });

  await page.locator('.question-card', { hasText: 'colonies' }).click();
  await page.waitForSelector('#notice-title');
  check('notice 2016 : titre', (await page.locator('#notice-title').textContent()).includes('résolution sur les colonies'));
  check('notice 2016 : focus sur le titre après navigation', (await focused(page)) === 'notice-title');
  check('notice 2016 : quinze sièges', (await page.locator('.seat').count()) === 15);
  check('notice 2016 : décompte du vote', (await page.locator('.vote__tally').textContent()) === '14 pour · 0 contre · 1 abstention');
  check('notice 2016 : § 12 collationné', (await page.locator('.para', { hasText: '12.' }).textContent()).includes('de lui faire rapport tous les trois mois'));
  await page.locator('.para', { hasText: '12.' }).click();
  check('notice 2016 : sélection du § 12', (await page.locator('.para[aria-pressed="true"] .para__n').textContent()) === '12.');
  check('notice 2016 : suites du § 12 dans le volet latéral', (await page.locator('.gloss--aside .followup').count()) === 2);
  check('notice 2016 : focus conservé sur le paragraphe', (await focused(page)) === 'para-12');
  await page.screenshot({ path: `${SHOTS}/desktop-notice-2334.png`, fullPage: true });

  const trigger = page.locator('.gloss--aside .followup').first();
  await trigger.click();
  const panel = page.locator('#source-panel');
  check('volet source : ouvert', await panel.isVisible());
  check('volet source : non modal sur ordinateur', (await panel.getAttribute('aria-modal')) === 'false');
  check('volet source : focus sur Fermer', (await focused(page)) === 'panel-close');
  check('volet source : lien daté vers S/2024/480', (await page.locator('.source-panel__link').getAttribute('href')) === 'https://docs.un.org/fr/S/2024/480');
  await page.screenshot({ path: `${SHOTS}/desktop-volet-source.png` });
  const before = await hash(page);
  await page.keyboard.press('ArrowRight');
  check('raccourci → inactif quand le volet est ouvert', (await hash(page)) === before);
  await page.keyboard.press('Escape');
  check('volet source : Échap ferme', await panel.isHidden());
  check('volet source : focus rendu au déclencheur', (await focused(page)) === 'fu-aside-12-0');

  await page.locator('#notice-title').focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => location.hash === '#/parcours/attaques-2023');
  check('raccourci → avance au repère suivant', true);
  await page.keyboard.press('ArrowLeft');
  await page.waitForFunction(() => location.hash === '#/parcours/resolution-2016');
  check('raccourci ← revient au repère précédent', true);

  await page.goto(BASE + '/#/parcours/attaques-2023');
  await page.locator('.filter', { hasText: 'Le droit' }).click();
  await page.waitForFunction(() => location.hash === '#/parcours/avis-2024' && document.querySelector('.chapters a[aria-current]')?.href.endsWith('avis-2024'));
  check('filtre « Le droit » : ouvre le repère le plus proche', true);
  check('filtre « Le droit » : deux repères', (await page.locator('.chapters a').count()) === 2);
  check('filtre : aria-pressed', (await page.locator('.filter[aria-pressed="true"]').textContent()) === 'Le droit');
  check('filtre : focus conservé sur le bouton', (await focused(page)) === 'filter-law');

  await page.locator('.main-nav a', { hasText: 'Qui parle' }).click();
  await page.waitForSelector('#voix-title', { state: 'visible' });
  check('Qui parle : page affichée', true);
  await page.locator('.tabs a', { hasText: 'En Israël' }).click();
  await page.waitForFunction(() => document.querySelector('.tabs a[aria-current]')?.href.endsWith('/voix/israel'));
  check('Qui parle : onglet Israël', (await page.locator('.voix-main h2').textContent()).includes('désaccords'));
  check('Qui parle : focus conservé sur l’onglet', (await focused(page)) === 'tab-israel');

  await page.locator('.main-nav a', { hasText: 'Lexique' }).click();
  await page.waitForSelector('#mots-title');
  check('Lexique : quatre termes', (await page.locator('.lexique article').count()) === 4);
  await page.locator('.main-nav a', { hasText: 'Méthode' }).click();
  const json = await page.request.get(BASE + '/data/reperes.json');
  const csv = await page.request.get(BASE + '/data/reperes-evenements.csv');
  check('Méthode : corpus JSON téléchargeable', json.ok() && (await json.json()).schema_version === '0.3.0');
  check('Méthode : CSV téléchargeable', csv.ok() && (await csv.text()).startsWith('id,year,title'));
  check('ordinateur : aucune requête vers un domaine tiers', page.external.length === 0, page.external.join(', '));
  check('ordinateur : aucune erreur JavaScript', page.errors.length === 0, page.errors.join(' | '));
  await page.context().close();
}

/* ---------- Réduction des animations ---------- */
{
  const page = await newPage({ width: 1366, height: 900 }, { reducedMotion: 'reduce' });
  await page.goto(BASE + '/');
  await page.waitForSelector('#home-title');
  const motion = await page.evaluate(() => ({
    card: getComputedStyle(document.querySelector('.question-card')).transitionDuration,
    scroll: getComputedStyle(document.documentElement).scrollBehavior,
  }));
  check('prefers-reduced-motion : transitions coupées', motion.card.split(',').every(v => parseFloat(v) === 0), motion.card);
  check('prefers-reduced-motion : défilement instantané', motion.scroll === 'auto');
  await page.context().close();
}

/* ---------- Mobile ---------- */
{
  const page = await newPage({ width: 390, height: 844 }, { hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  await page.goto(BASE + '/#/parcours/resolution-2016');
  await page.waitForSelector('#notice-title');
  check('mobile : navigation principale masquée', await page.locator('.main-nav').isHidden());
  check('mobile : barre de progression du bas', await page.locator('#bottom-bar').isVisible());
  check('mobile : glose du paragraphe dans le flux', await page.locator('.gloss--inline').isVisible());
  check('mobile : pas de défilement horizontal (notice)', await noHorizontalScroll(page));
  await page.screenshot({ path: `${SHOTS}/mobile-notice-2334.png`, fullPage: true });

  const toggle = page.locator('#menu-toggle');
  await toggle.click();
  check('menu mobile : ouvert', await page.locator('#menu-mobile').isVisible());
  check('menu mobile : aria-expanded', (await toggle.getAttribute('aria-expanded')) === 'true');
  check('menu mobile : focus sur le premier lien', (await focused(page)).startsWith('Le parcours'));
  check('menu mobile : contenu de la page inerte', await page.evaluate(() => document.getElementById('contenu').inert));
  for (let i = 0; i < 5; i++) await page.keyboard.press('Tab');
  check('menu mobile : Tab revient au bouton Fermer', (await focused(page)) === 'menu-toggle');
  await page.keyboard.press('Shift+Tab');
  check('menu mobile : Maj+Tab va au dernier lien', (await focused(page)).startsWith('Méthode'));
  const before = await hash(page);
  await page.keyboard.press('ArrowRight');
  check('raccourci → inactif quand le menu est ouvert', (await hash(page)) === before);
  await page.screenshot({ path: `${SHOTS}/mobile-menu.png` });
  await page.keyboard.press('Escape');
  check('menu mobile : Échap ferme', await page.locator('#menu-mobile').isHidden());
  check('menu mobile : focus rendu au bouton', (await focused(page)) === 'menu-toggle');

  await page.locator('.notice__aside .source-button').first().click();
  const panel = page.locator('#source-panel');
  check('volet mobile : modal', (await panel.getAttribute('aria-modal')) === 'true');
  check('volet mobile : fond occultant', await page.locator('#panel-backdrop').isVisible());
  check('volet mobile : page inerte', await page.evaluate(() => document.getElementById('contenu').inert));
  for (let i = 0; i < 4; i++) await page.keyboard.press('Tab');
  check('volet mobile : le focus reste dans le volet', await page.evaluate(() => document.getElementById('source-panel').contains(document.activeElement)));
  await page.screenshot({ path: `${SHOTS}/mobile-volet-source.png` });
  await page.locator('#panel-backdrop').click({ position: { x: 20, y: 20 } });
  check('volet mobile : toucher le fond ferme', await panel.isHidden());

  await page.goto(BASE + '/');
  await page.waitForSelector('#home-title');
  check('mobile : liste chronologique à l’accueil', (await page.locator('.home-list li').count()) === 7);
  check('mobile : pas de défilement horizontal (accueil)', await noHorizontalScroll(page));
  await page.screenshot({ path: `${SHOTS}/mobile-accueil.png`, fullPage: true });
  check('mobile : aucune requête vers un domaine tiers', page.external.length === 0, page.external.join(', '));
  check('mobile : aucune erreur JavaScript', page.errors.length === 0, page.errors.join(' | '));
  await page.context().close();
}

await browser.close();
const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} vérifications réussies.`);
process.exit(failed.length ? 1 : 0);
