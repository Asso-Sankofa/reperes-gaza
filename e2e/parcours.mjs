// Vérification des principaux parcours dans Chromium (Playwright), sur ordinateur et en largeur mobile.
// Lancé par `docker compose run --rm e2e`. BASE_URL désigne le site à tester (local ou déployé).
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import fs from 'node:fs';

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
const pressed = page => page.evaluate(() => document.querySelector('.place-filter[aria-pressed="true"]')?.dataset.place);
const muted = page => page.evaluate(() => [...document.querySelectorAll('.explorer__map [data-zone].is-muted')].map(z => z.dataset.zone).join(' '));
const years = page => page.locator('.map-list .map-list__year').allTextContents();
const noHorizontalScroll = page => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

/* ---------- Ordinateur ---------- */
{
  const page = await newPage({ width: 1366, height: 900 });
  await page.goto(BASE + '/');
  await page.waitForSelector('#home-title');
  check('accueil : titre affiché', await page.locator('#home-title').isVisible());
  check('accueil : six questions', (await page.locator('.question-card').count()) === 6);
  check('accueil : frise avec huit repères', (await page.locator('[data-slot="home-rail"] .rail__dot').count()) === 8);
  check('accueil : polices chargées localement', await page.evaluate(async () => { await document.fonts.ready; return document.fonts.check('16px "DM Sans"') && document.fonts.check('16px "Libre Caslon Display"'); }));
  check('accueil : nouveau titre', (await page.locator('#home-title').innerText()).replace(/\s+/g, ' ') === 'Comprendre le rôle de la France dans la question de Gaza');
  check('accueil : bouton « Lire le premier repère »', (await page.locator('.hero__cta').getAttribute('href')) === '#/parcours/nakba-1948');
  check('carte : SVG intégré, nommé', (await page.locator('.explorer__map svg[role="img"]').count()) === 1 && (await page.locator('#map-region-title').count()) === 1);
  check('carte : légende et lien vers la méthode', (await page.locator('.map-caption a[href="#/methode"]').count()) === 1);
  check('sommaire : trois commandes, les huit repères par défaut', (await page.locator('.place-filter').count()) === 3 && (await pressed(page)) === 'all' && (await years(page)).length === 8);
  check('sommaire : bouton « Voir les huit repères »', await page.getByRole('button', { name: 'Voir les huit repères' }).isVisible());
  check('sommaire : zone d’annonce polie', (await page.locator('.map-summary__status').getAttribute('role')) === 'status');

  // Clavier : Tab jusqu'à « Gaza », Entrée ; puis Tab, Espace sur « Cisjordanie ».
  await page.locator('[data-focus="place-all"]').focus();
  await page.keyboard.press('Tab');
  check('clavier : Tab atteint « Gaza »', (await focused(page)) === 'place-gaza');
  await page.keyboard.press('Enter');
  check('clavier : Entrée sélectionne Gaza', (await pressed(page)) === 'gaza');
  check('Gaza : 1967, 2005, 2016, 2023, 2024', (await years(page)).join(',') === '1967,2005,2016,2023,2024');
  check('Gaza : annonce du nombre de repères', (await page.locator('.map-summary__status').textContent()) === 'Bande de Gaza\u00a0: 5 repères sur 8');
  check('Gaza : carte synchronisée', (await muted(page)) === 'cisjordanie');
  check('Gaza : 1948, 1949 et 2025 restent accessibles', (await page.locator('.map-summary__off a').count()) === 3);
  check('Gaza : 2023 mentionne le sud d’Israël', (await page.locator('.map-list li', { hasText: '2023' }).innerText()).includes('Sud d’Israël'));
  check('clavier : focus conservé sur la commande', (await focused(page)) === 'place-gaza');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Space');
  check('clavier : Espace sélectionne la Cisjordanie', (await pressed(page)) === 'cisjordanie' && (await years(page)).join(',') === '1967,2016,2024');
  check('Cisjordanie : carte synchronisée', (await muted(page)) === 'gaza');
  await page.locator('.explorer__map .map__hit').click({ force: true });
  check('carte : un clic sur Gaza met à jour les commandes', (await pressed(page)) === 'gaza');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/desktop-accueil-gaza.png` });
  await page.getByRole('button', { name: 'Voir les huit repères' }).click();
  check('« Voir les huit repères » rétablit la liste complète', (await years(page)).length === 8 && (await muted(page)) === '');
  await page.screenshot({ path: `${SHOTS}/desktop-accueil.png`, fullPage: true });

  // Sans carte (SVG absent ou non rendu), les commandes et la liste fonctionnent seules.
  await page.evaluate(() => document.querySelector('.explorer__map svg').remove());
  await page.getByRole('button', { name: 'Cisjordanie' }).click();
  check('sans carte : le filtre fonctionne', (await years(page)).length === 3 && page.errors.length === 0, page.errors.join(' | '));
  await page.getByRole('button', { name: 'Voir les huit repères' }).click();

  await page.goto(BASE + '/#/parcours/retrait-2005');
  await page.waitForSelector('#notice-title');
  check('miniature 2005 : Gaza en évidence', await page.evaluate(() => {
    const f = document.querySelector('.notice__place');
    return !!f && !f.querySelector('[data-zone="gaza"]').classList.contains('is-muted') && f.querySelector('[data-zone="cisjordanie"]').classList.contains('is-muted');
  }));
  check('miniature 2005 : nom accessible', (await page.locator('.notice__place svg').getAttribute('aria-label')).includes('Bande de Gaza'));
  await page.screenshot({ path: `${SHOTS}/desktop-notice-2005.png` });
  // La miniature ne répète pas la carte de l'accueil : pas de carte quand tout le territoire dessiné est concerné.
  for (const id of ['guerre-1967', 'attaques-2023', 'nakba-1948']) {
    await page.goto(BASE + '/#/parcours/' + id);
    await page.waitForSelector('#notice-title');
    check(`${id} : pas de miniature`, (await page.locator('.notice__place').count()) === 0);
  }
  await page.goto(BASE + '/');
  await page.waitForSelector('#home-title');

  await page.locator('.question-card', { hasText: 'colonies' }).click();
  await page.waitForSelector('#notice-title');
  check('notice 2016 : titre', (await page.locator('#notice-title').textContent()).includes('résolution 2334 de l’ONU sur les colonies israéliennes'));
  check('notice 2016 : focus sur le titre après navigation', (await focused(page)) === 'notice-title');
  check('notice 2016 : sources appelées dans le texte', (await page.locator('.notice__text .cite').allTextContents()).join(',') === '1,2');
  check('notice 2016 : notes de marge sur ordinateur', (await page.locator('.sidenote').first().isVisible()) && (await page.locator('.reading__sources').isHidden()));
  await page.locator('.notice__text .cite').nth(1).click();
  check('appel de source : ouvre le volet de la source', (await page.locator('#panel-title').textContent()).includes('S/RES/2334'));
  await page.keyboard.press('Escape');
  check('notice 2016 : liens vers les actes de la page Décisions', (await page.locator('.reading__decisions a').evaluateAll(l => l.map(a => a.getAttribute('href')))).join(' ') === '#/decisions/etiquetage-2016 #/decisions/resolution-2334-2016 #/decisions/conseil-etat-2019');
  check('notice 2016 : le document n’est plus dans la page', (await page.locator('.seat').count()) === 0);
  await page.locator('.reading__doc a').click();
  await page.waitForSelector('#doc-title');
  check('document 2334 : page propre, titre focalisé', (await hash(page)) === '#/parcours/resolution-2016/texte' && (await focused(page)) === 'doc-title');
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

  await page.goto(BASE + '/#/parcours/resolution-2016');
  await page.waitForSelector('#notice-title');
  await page.locator('#notice-title').focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => location.hash === '#/parcours/attaques-2023');
  check('raccourci → avance au repère suivant', true);
  await page.keyboard.press('ArrowLeft');
  await page.waitForFunction(() => location.hash === '#/parcours/resolution-2016');
  check('raccourci ← revient au repère précédent', true);

  await page.goto(BASE + '/#/parcours/attaques-2023');
  await page.waitForSelector('#notice-title');
  check('sommaire des repères : replié par défaut', (await page.locator('.chapters').isHidden()) && (await page.locator('.toc summary').innerText()).includes('REPÈRE 6 SUR 8'));
  await page.locator('.toc summary').click();
  check('sommaire des repères : huit repères', (await page.locator('.chapters a').count()) === 8 && (await page.locator('.chapters a[aria-current]').getAttribute('href')) === '#/parcours/attaques-2023');
  await page.goto(BASE + '/#/parcours/guerre-1967');
  await page.waitForSelector('#notice-title');
  await page.locator('.reading__decisions a').first().click();
  await page.waitForFunction(() => document.activeElement?.id === 'decision-embargo-juin-1967', null, { timeout: 3000 }).catch(() => {});
  check('lien vers un acte : focus sur l’acte', (await focused(page)) === 'decision-embargo-juin-1967');

  await page.locator('.main-nav a', { hasText: 'Décisions françaises' }).click();
  await page.waitForFunction(() => location.hash === '#/decisions' && document.activeElement?.id === 'decisions-title', null, { timeout: 3000 }).catch(() => {});
  check('Décisions françaises : titre focalisé', (await focused(page)) === 'decisions-title');
  check('Décisions françaises : dix actes, dans l’ordre', (await page.locator('.decision__date').allTextContents()).join(' | ') === '11 mai 1949 | Juin 1967 | Juillet 1967 | 24 novembre 2016 | 23 décembre 2016 | 31 décembre 2019 | 18 septembre 2024 | 22 septembre 2025 | 30 juin 2026 | 8 septembre 2026');
  await page.locator('[data-focus="src-dec-embargo-juillet-1967-an-1968"]').click();
  check('Décisions françaises : le document s’ouvre', (await page.locator('#panel-title').textContent()).includes('17 mai 1968'));
  await page.keyboard.press('Escape');
  check('Décisions françaises : lien vers le repère', (await page.locator('.decision .pill').first().getAttribute('href')) === '#/parcours/france-1949');

  await page.locator('.main-nav a', { hasText: 'Acteurs et enquêtes' }).click();
  await page.waitForSelector('#voix-title', { state: 'visible' });
  check('Acteurs et enquêtes : page affichée', true);
  await page.locator('.tabs a', { hasText: 'En Israël' }).click();
  await page.waitForFunction(() => document.querySelector('.tabs a[aria-current]')?.href.endsWith('/voix/israel'));
  check('Acteurs et enquêtes : onglet Israël', (await page.locator('.voix-main h2').textContent()).includes('institut d’enquêtes'));
  check('Acteurs et enquêtes : focus conservé sur l’onglet', (await focused(page)) === 'tab-israel');

  await page.locator('.main-nav a', { hasText: 'Lexique' }).click();
  await page.waitForSelector('#mots-title');
  check('Lexique : trois termes', (await page.locator('.lexique article').count()) === 3);
  await page.locator('.main-nav a', { hasText: 'Méthode' }).click();
  const json = await page.request.get(BASE + '/data/reperes.json');
  const csv = await page.request.get(BASE + '/data/reperes-evenements.csv');
  check('Méthode : corpus JSON téléchargeable', json.ok() && (await json.json()).schema_version === '0.4.0');
  check('Méthode : provenance de la carte', (await page.locator('#methode-carte').innerText()).includes('Natural Earth, version 4.1.0'));
  check('Méthode : empreinte du fichier affichée', /^[0-9a-f]{64}$/.test(await page.locator('.map-method__hash').textContent()));
  const og = await page.request.get(BASE + '/og-image.png');
  check('partage : image OpenGraph servie', og.ok() && og.headers()['content-type'].startsWith('image/png') && (await page.locator('meta[property="og:image"]').getAttribute('content')) === 'https://reperes-gaza.fr/og-image.png');
  check('en-tête : logo chargé', await page.locator('.brand__mark').evaluate(i => i.complete && i.naturalWidth > 0));
  check('Méthode : CSV téléchargeable', csv.ok() && (await csv.text()).startsWith('id,year,title'));
  check('ordinateur : aucune requête vers un domaine tiers', page.external.length === 0, page.external.join(', '));
  check('ordinateur : aucune erreur JavaScript', page.errors.length === 0, page.errors.join(' | '));
  await page.context().close();
}

/* ---------- Accessibilité : règles automatiques (axe-core, WCAG 2.1 A et AA) ---------- */
{
  const axeSrc = fs.readFileSync(new URL('./node_modules/axe-core/axe.min.js', import.meta.url), 'utf8');
  const routes = ['', 'parcours/nakba-1948', 'parcours/retrait-2005', 'parcours/resolution-2016', 'parcours/resolution-2016/texte', 'decisions', 'voix', 'verifier', 'mots', 'methode'];
  for (const [viewport, label] of [[{ width: 1366, height: 900 }, 'ordinateur'], [{ width: 390, height: 844 }, 'mobile']]) {
    const page = await newPage(viewport);
    const found = [];
    for (const r of routes) {
      await page.goto(`${BASE}/#/${r}`);
      await page.waitForSelector('main h1:visible');
      await page.evaluate(axeSrc);
      const res = await page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }));
      for (const v of res.violations) found.push(`#/${r} ${v.id} (${v.nodes.length})`);
    }
    check(`axe-core : aucune violation (${label})`, found.length === 0, found.join(', '));
    await page.goto(`${BASE}/#/parcours/nakba-1948`);
    await page.waitForSelector('#notice-title');
    check(`langue : titre de source en anglais marqué (${label})`, (await page.locator('.source-button__title [lang="en"], .sidenote__title [lang="en"]').first().textContent()) === 'About the Nakba');
    await page.context().close();
  }
}

/* ---------- Lecteur audio (synthèse vocale simulée) ---------- */
{
  const page = await newPage({ width: 1366, height: 900 });
  // Synthèse factice : on enregistre ce qui serait lu, sans dépendre des voix installées.
  await page.addInitScript(() => {
    window.__spoken = [];
    const synth = { speaking: false, paused: false, getVoices: () => [],
      speak(u) { window.__spoken.push({ text: u.text, lang: u.lang }); this.last = u; },
      pause() { this.paused = true; }, resume() { this.paused = false; },
      cancel() { window.__cancelled = (window.__cancelled || 0) + 1; } };
    Object.defineProperty(window, 'speechSynthesis', { value: synth });
    window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  });
  await page.goto(BASE + '/#/parcours/nakba-1948');
  await page.waitForSelector('#notice-title');
  await page.getByRole('button', { name: 'Écouter' }).click();
  const spoken = await page.evaluate(() => window.__spoken);
  const all = spoken.map(x => x.text).join(' ');
  check('lecteur : lit l’année, le titre et le texte', all.startsWith('1948. Le déplacement') && all.includes('guerre israélo-arabe de 1948'));
  check('lecteur : ne lit pas les appels de source', !/\[\[|\]\]/.test(all));
  check('lecteur : focus sur Pause', (await focused(page)) === 'listen-toggle' && (await page.locator('[data-listen="pause"]').isVisible()));
  await page.getByRole('button', { name: 'Pause' }).click();
  check('lecteur : Pause puis Reprendre', await page.getByRole('button', { name: 'Reprendre' }).isVisible());
  await page.getByRole('button', { name: 'Arrêter' }).click();
  check('lecteur : Arrêter revient à Écouter', (await focused(page)) === 'listen-play');
  await page.goto(BASE + '/#/mots');
  await page.goto(BASE + '/#/parcours/resolution-2016');
  await page.waitForSelector('#notice-title');
  await page.getByRole('button', { name: 'Écouter' }).click();
  const before = await page.evaluate(() => window.__cancelled || 0);
  await page.locator('.pager__next').click();
  await page.waitForFunction(b => location.hash === '#/parcours/attaques-2023' && (window.__cancelled || 0) > b && document.querySelector('[data-listen="play"]'), before, { timeout: 3000 }).catch(() => {});
  check('lecteur : la lecture s’arrête au changement de repère', (await page.evaluate(() => window.__cancelled || 0)) > before && (await page.getByRole('button', { name: 'Écouter' }).isVisible()));
  await page.goto(BASE + '/#/parcours/resolution-2016/texte');
  await page.waitForSelector('#doc-title');
  check('lecteur : absent de la page du document', (await page.locator('.listen').count()) === 0);
  check('lecteur : aucune erreur JavaScript', page.errors.length === 0, page.errors.join(' | '));
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
  await page.goto(BASE + '/#/parcours/resolution-2016/texte');
  await page.waitForSelector('#doc-title');
  check('mobile : glose du paragraphe dans le flux', await page.locator('.gloss--inline').isVisible());
  check('mobile : pas de défilement horizontal (document)', await noHorizontalScroll(page));
  await page.screenshot({ path: `${SHOTS}/mobile-notice-2334.png`, fullPage: true });
  await page.goto(BASE + '/#/parcours/resolution-2016');
  await page.waitForSelector('#notice-title');
  check('mobile : navigation principale masquée', await page.locator('.main-nav').isHidden());
  check('mobile : barre de progression du bas', await page.locator('#bottom-bar').isVisible());
  check('mobile : une seule navigation entre repères', await page.locator('.pager').isHidden());
  check('mobile : sources listées sous le texte, sans notes de marge', (await page.locator('.reading__sources').isVisible()) && (await page.locator('.sidenote').first().isHidden()));
  const textBox = await page.locator('.notice__text').boundingBox();
  check('mobile : le texte du repère tient dans le premier écran', textBox.y + textBox.height <= 844 - 64, `bas du texte à ${Math.round(textBox.y + textBox.height)} px`);
  check('mobile : pas de défilement horizontal (notice)', await noHorizontalScroll(page));

  const toggle = page.locator('#menu-toggle');
  await toggle.click();
  check('menu mobile : ouvert', await page.locator('#menu-mobile').isVisible());
  check('menu mobile : aria-expanded', (await toggle.getAttribute('aria-expanded')) === 'true');
  check('menu mobile : focus sur le premier lien', (await focused(page)).startsWith('Les repères'));
  check('menu mobile : contenu de la page inerte', await page.evaluate(() => document.getElementById('contenu').inert));
  for (let i = 0; i < 6; i++) await page.keyboard.press('Tab');
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

  await page.locator('.reading__sources .source-button').first().click();
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
  const box = sel => page.locator(sel).first().boundingBox();
  const [ttl, cta, q1] = [await box('#home-title'), await box('.hero__cta'), await box('.question-card')];
  check('mobile : titre, chapô et bouton dans le premier écran', ttl.y >= 0 && cta.y + cta.height <= 844, `bas du bouton à ${Math.round(cta.y + cta.height)} px`);
  check('mobile : les questions suivent le bouton', q1.y > cta.y);
  const [ctl, lst, map] = [await box('.map-summary__controls'), await box('.map-list'), await box('.explorer__map')];
  check('mobile : commandes, puis liste, puis carte', ctl.y < lst.y && lst.y < map.y);
  check('mobile : cibles tactiles d’au moins 44 px', (await page.locator('.place-filter').evaluateAll(b => b.every(x => x.getBoundingClientRect().height >= 44))));
  await page.getByRole('button', { name: 'Gaza' }).tap();
  check('mobile : toucher « Gaza » filtre la liste', (await pressed(page)) === 'gaza' && (await years(page)).length === 5);
  await page.getByRole('button', { name: 'Voir les huit repères' }).tap();
  await page.locator('.explorer__map').scrollIntoViewIfNeeded();
  const gz = await page.locator('.explorer__map [data-zone="gaza"]').boundingBox();
  await page.touchscreen.tap(gz.x + gz.width / 2, gz.y + gz.height / 2);
  check('mobile : toucher Gaza sur la carte', (await pressed(page)) === 'gaza', `zone ${Math.round(gz.width)}×${Math.round(gz.height)} px`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/mobile-accueil-gaza.png`, fullPage: true });
  await page.getByRole('button', { name: 'Voir les huit repères' }).tap();
  check('mobile : liste chronologique à l’accueil', (await page.locator('.map-list li').count()) === 8);
  check('mobile : pas de défilement horizontal (accueil)', await noHorizontalScroll(page));
  await page.screenshot({ path: `${SHOTS}/mobile-accueil.png`, fullPage: true });
  check('mobile : aucune requête vers un domaine tiers', page.external.length === 0, page.external.join(', '));
  check('mobile : aucune erreur JavaScript', page.errors.length === 0, page.errors.join(' | '));
  await page.context().close();
}

/* ---------- Petit écran (320 px) ---------- */
{
  const page = await newPage({ width: 320, height: 640 }, { hasTouch: true, isMobile: true });
  for (const r of ['/', '/#/parcours/resolution-2016']) {
    await page.goto(BASE + r);
    await page.waitForTimeout(300);
    check(`320 px : pas de défilement horizontal (${r})`, await noHorizontalScroll(page));
  }
  await page.screenshot({ path: `${SHOTS}/mobile320-notice-2016.png`, fullPage: true });
  await page.context().close();
}

await browser.close();
const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} vérifications réussies.`);
process.exit(failed.length ? 1 : 0);
