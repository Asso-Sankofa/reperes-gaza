// Repères : interface du prototype, sans dépendance.
// Le corpus est injecté dans index.html par scripts/build.mjs (<script type="application/json" id="corpus">).

const data = JSON.parse(document.getElementById('corpus').textContent);

const MOBILE = window.matchMedia('(max-width: 719.98px)');
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');
const ROUTES = ['parcours', 'decisions', 'voix', 'verifier', 'mots', 'methode'];
const RAIL_START = 1945;
const RAIL_END = 2026;
const RAIL_TICKS = [1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];

const events = data.events;
const sourceById = new Map(data.sources.map(s => [s.id, s]));
const termById = new Map(data.terms.map(t => [t.id, t]));
const eventById = new Map(events.map(e => [e.id, e]));
const placeById = new Map(data.places.map(p => [p.id, p]));
const mapPlaces = data.places.filter(p => p.map_zone);
// Une notice est « située » si au moins un de ses lieux est dessiné sur la carte.
const zonesOf = e => e.places.map(id => placeById.get(id).map_zone).filter(Boolean);
const fullyMapped = e => e.places.length > 0 && zonesOf(e).length === e.places.length;
const actorKeys = Object.keys(data.actors);

const PAGE_TITLES = {
  accueil: 'Repères · Gaza et la France',
  decisions: 'Décisions françaises · Repères',
  voix: 'Acteurs et enquêtes · Repères',
  verifier: 'Bilans de victimes · Repères',
  mots: 'Lexique · Repères',
  methode: 'Méthode · Repères',
};
const SECTION_PAGER = {
  decisions: ['#/parcours', 'SECTION PRÉCÉDENTE', 'Les repères', '#/voix', 'SECTION SUIVANTE', 'Acteurs et enquêtes'],
  voix: ['#/decisions', 'SECTION PRÉCÉDENTE', 'Décisions françaises', '#/verifier', 'SECTION SUIVANTE', 'Bilans de victimes'],
  verifier: ['#/voix', 'SECTION PRÉCÉDENTE', 'Acteurs et enquêtes', '#/mots', 'SECTION SUIVANTE', 'Lexique'],
  mots: ['#/verifier', 'SECTION PRÉCÉDENTE', 'Bilans de victimes', '#/methode', 'SECTION SUIVANTE', 'Méthode'],
  methode: ['#/mots', 'SECTION PRÉCÉDENTE', 'Lexique', '#/', 'RETOUR', 'Les questions de départ'],
};

const state = {
  ...parseHash(),
  place: 'all',
  sourceId: null,
  selPara: {},
  tocOpen: false,
  moreOpen: false,
  menuOpen: false,
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const el = {
  header: $('#site-header'),
  main: $('#contenu'),
  footer: $('.site-footer'),
  menuToggle: $('#menu-toggle'),
  menu: $('#menu-mobile'),
  progress: $('#progress'),
  progressBar: $('#progress-bar'),
  bottomBar: $('#bottom-bar'),
  panel: $('#source-panel'),
  panelBody: $('#panel-body'),
  panelClose: $('#panel-close'),
  backdrop: $('#panel-backdrop'),
};

// Échappement systématique : le corpus est de confiance, mais il reste une donnée.
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ESC[c]);

function parseHash() {
  const h = (window.location.hash || '').replace(/^#\/?/, '');
  const [r, a, b] = h.split('/');
  return { route: ROUTES.includes(r) ? r : 'accueil', param: a ? decodeURIComponent(a) : null, sub: b || null };
}

const evHref = e => '#/parcours/' + encodeURIComponent(e.id);
const railPos = e => ((Number(e.year) - RAIL_START) / (RAIL_END - RAIL_START)) * 100;
const scrollBehavior = () => (REDUCED.matches ? 'auto' : 'smooth');

// Le repère courant et sa position dans la liste complète.
function parcoursContext(param = state.param) {
  const ev = eventById.get(param) || events[0];
  return { ev, list: events, idx: events.indexOf(ev) };
}

/* ---------- Fragments ---------- */

const joinFr = items => (items.length > 1 ? `${items.slice(0, -1).join(', ')} et ${items.at(-1)}` : items[0] || '');
const placeLabels = e => e.places.map(id => placeById.get(id).label);

// Sommaire de l'accueil : les boutons pilotent la liste et la carte ; la carte relaie seulement le clic.
function renderMapSummary(node, listNode) {
  if (!node || !listNode) return;
  const place = placeById.get(state.place);
  const list = place ? events.filter(e => e.places.includes(place.id)) : events;
  const offMap = events.filter(e => !zonesOf(e).length);
  const word = node.dataset.countWord;
  const options = [['all', `Voir les ${word} repères`], ...mapPlaces.map(p => [p.id, p.short])];
  const status = place
    ? `${place.label} : ${list.length} repère${list.length > 1 ? 's' : ''} sur ${events.length}`
    : `${word[0].toUpperCase() + word.slice(1)} repères, de ${events[0].year} à ${events.at(-1).year}`;
  node.innerHTML = `<h3 class="map-summary__title">Filtrer par territoire</h3>
    <div class="map-summary__controls" role="group" aria-label="Afficher les repères par territoire">
      ${options.map(([k, label]) => `<button type="button" class="place-filter" aria-pressed="${state.place === k}" data-place="${esc(k)}" data-focus="place-${esc(k)}">${esc(label)}</button>`).join('')}
    </div>
    <p class="map-summary__status" role="status">${esc(status)}</p>`;
  listNode.innerHTML = `<ol class="map-list">
      ${list.map(e => `<li><a href="${evHref(e)}">
        <span class="map-list__year">${esc(e.year)}</span>
        <span class="map-list__body"><span class="map-list__title">${esc(e.title)}</span>
        ${e.places.length ? `<span class="map-list__places">${esc(placeLabels(e).join(' · '))}</span>` : ''}</span>
        <span class="map-list__arrow" aria-hidden="true">→</span></a></li>`).join('')}
    </ol>
    ${place && offMap.length ? `<p class="map-summary__off">Hors carte&nbsp;: ${offMap.map(e => `<a href="${evHref(e)}">${esc(e.year)} · ${esc(e.short)}</a>`).join(', ')}</p>` : ''}`;
  const fig = $('[data-map="region"]');
  if (fig) fig.dataset.mapZones = place ? place.map_zone : mapPlaces.map(p => p.map_zone).join(' ');
}

// Miniature seulement quand elle distingue une partie du territoire dessiné (2005 : Gaza seule).
// Sinon elle répète la carte de l'accueil.
function noticePlace(e) {
  const mini = $('#map-mini');
  if (!mini || !fullyMapped(e) || zonesOf(e).length >= mapPlaces.length) return '';
  const labels = joinFr(placeLabels(e));
  const svg = mini.innerHTML.replace('role="img"', `role="img" aria-label="${esc(`Carte de situation. Mis en évidence : ${labels}.`)}"`);
  return `<figure class="notice__place" data-map-zones="${esc(zonesOf(e).join(' '))}">${svg}
    <figcaption><span class="notice__place-name">${esc(labels)}</span> <a href="#/methode">Sources de la carte</a></figcaption>
  </figure>`;
}

// Appels de source [[id]] : numérotés dans l'ordre d'apparition. La note de marge (ordinateur) suit le premier appel.
const CALL = /\[\[([a-z0-9-]+)\]\]/g;
const citedOrder = ev => [...new Set([...`${ev.text} ${ev.context || ''}`.matchAll(CALL)].map(m => m[1]))];

function withCalls(text, order, seen) {
  return esc(text).replace(CALL, (_, id) => {
    const n = order.indexOf(id) + 1;
    const s = sourceById.get(id);
    const first = !seen.has(id);
    seen.add(id);
    return `<button type="button" class="cite" data-source="${esc(id)}" aria-label="Source ${n} : ${esc(s.publisher)}">${n}</button>${first
      ? `<span class="sidenote" data-source="${esc(id)}" aria-hidden="true"><span class="sidenote__n">${n}</span><span class="sidenote__publisher">${esc(s.publisher)}</span><span class="sidenote__title">${esc(s.title)}</span></span>`
      : ''}`;
  });
}

function sourceButtons(ids, ctx, compact = false) {
  return (ids || []).map((id, i) => {
    const s = sourceById.get(id);
    return `<button type="button" class="source-button${compact ? ' source-button--compact' : ''}" data-source="${esc(id)}" data-focus="src-${esc(ctx)}-${esc(id)}">
      <span class="source-button__n">${String(i + 1).padStart(2, '0')}</span>
      <span><span class="source-button__publisher">${esc(s.publisher)}</span>${compact ? '' : `<span class="source-button__title">${esc(s.title)}</span>`}</span>
      <span aria-hidden="true">↗</span>
    </button>`;
  }).join('');
}

function rail(current, list) {
  const labels = [];
  events.forEach(e => {
    const l = railPos(e);
    const last = labels[labels.length - 1];
    if (last && l - last.max < 4) { last.items.push(e); last.ls.push(l); last.max = l; }
    else labels.push({ items: [e], ls: [l], max: l });
  });
  const cls = e => (current && e.id === current.id ? ' is-active' : list.includes(e) ? '' : ' is-out');
  return `<div class="rail__line"></div>
    ${RAIL_TICKS.map(y => `<div class="rail__tick" data-left="${((y - RAIL_START) / (RAIL_END - RAIL_START)) * 100}"><span>${y}</span></div>`).join('')}
    ${labels.map(c => {
      const active = current && c.items.some(x => x.id === current.id);
      const inList = c.items.some(x => list.includes(x));
      const left = c.ls.reduce((a, b) => a + b, 0) / c.ls.length;
      return `<span class="rail__label${active ? ' is-active' : inList ? '' : ' is-out'}" data-left="${left}">${esc(c.items.map(x => x.year).join(' · '))}</span>`;
    }).join('')}
    ${events.map(e => `<a class="rail__dot${cls(e)}" href="${evHref(e)}" tabindex="-1" title="${esc(e.year + ', ' + e.short)}" data-left="${railPos(e)}"></a>`).join('')}`;
}

function gloss(p, variant) {
  const followups = p.followups.map((f, i) => {
    const s = sourceById.get(f.source);
    return `<button type="button" class="followup" data-source="${esc(f.source)}" data-focus="fu-${variant}-${esc(p.n)}-${i}">
      <span class="followup__head"><span>${esc(s.publisher)}</span><span aria-hidden="true">↗</span></span>
      <span class="followup__title">${esc(s.title)}</span>
      <span class="followup__note">${esc(f.note)}</span>
    </button>`;
  }).join('');
  return `<p class="eyebrow">PARAGRAPHE ${esc(p.n)} · À QUI S’ADRESSE-T-IL ?</p>
    <p class="gloss__addressee">${esc(p.addressee)}</p>
    <p class="gloss__text">${esc(p.gloss)}</p>
    <p class="eyebrow">POUR EXAMINER SES SUITES</p>
    ${followups}
    <div class="gloss__open"><p class="eyebrow">QUESTION OUVERTE</p><p class="gloss__question">${esc(p.question)}</p></div>`;
}

function documentSection(ev, doc) {
  const V = doc.vote;
  const seats = [
    ...V.pour.map(n => [n, 'POUR', 'pour']),
    ...V.contre.map(n => [n, 'CONTRE', 'contre']),
    ...V.abstention.map(n => [n, 'ABSTENTION', 'abstention']),
  ];
  const tally = `${V.pour.length} pour · ${V.contre.length} contre · ${V.abstention.length} abstention${V.abstention.length > 1 ? 's' : ''}`;
  const sel = state.selPara[ev.id] && doc.paragraphs.some(p => p.n === state.selPara[ev.id])
    ? state.selPara[ev.id]
    : (doc.defaultParagraph || doc.paragraphs[0].n);
  const selected = doc.paragraphs.find(p => p.n === sel);
  const col = doc.collation;
  return `<section class="doc-section" aria-labelledby="doc-title">
    <div class="wrap doc-section__inner">
      <div class="section-head">
        <div>
          <p class="eyebrow">LE DOCUMENT · ${esc(doc.ref)}</p>
          <h1 id="doc-title" class="display display--h1" tabindex="-1">${esc(doc.title)}&nbsp;: le vote et le texte adopté</h1>
        </div>
      </div>
      <div class="card vote">
        <div class="vote__head">
          <p class="eyebrow eyebrow--muted">LE VOTE · ${esc(doc.date)}</p>
          <p class="vote__tally">${esc(tally)}</p>
        </div>
        <ul class="seats" aria-label="Vote des ${seats.length} membres du Conseil">
          ${seats.map(([n, label, kind]) => `<li class="seat seat--${kind}${n === 'France' ? ' seat--france' : ''}"><span>${esc(n)}</span><span class="seat__vote">${label}</span></li>`).join('')}
        </ul>
        <div class="vote__foot">
          ${doc.voteNote ? `<p>${esc(doc.voteNote)}</p>` : ''}
          <button type="button" class="button button--outline" data-source="${esc(doc.sourceVote)}" data-focus="doc-vote">Lire l’explication de vote française <span aria-hidden="true">↗</span></button>
        </div>
      </div>
      <div class="doc-layout">
        <div class="card doc-text">
          <div class="doc-text__head"><span>NATIONS UNIES · ${esc(doc.body.toUpperCase())}</span><span>${esc(doc.ref)}</span></div>
          <p class="doc-text__title">${esc(doc.title)}</p>
          <p class="doc-text__date">Adoptée le ${esc(doc.date)} · extraits du dispositif</p>
          <p class="doc-text__preamble">Le Conseil de sécurité, […]</p>
          <ol class="paras">
            ${doc.paragraphs.map(p => `<li>
              <button type="button" class="para" aria-pressed="${p.n === sel}" data-para="${esc(p.n)}" data-focus="para-${esc(p.n)}">
                <span class="para__n">${esc(p.n)}.</span>
                <span class="para__text">${esc(p.text)}</span>
              </button>
              ${p.n === sel ? `<div class="gloss gloss--inline" aria-live="polite">${gloss(p, 'inline')}</div>` : ''}
            </li>`).join('')}
          </ol>
          <div class="doc-text__foot">
            <p>${esc(doc.note)}</p>
            <button type="button" class="button button--solid" data-source="${esc(doc.sourceText)}" data-focus="doc-text">Texte officiel intégral <span aria-hidden="true">↗</span></button>
          </div>
          ${col ? `<details class="collation card">
            <summary>Comment cette transcription a été vérifiée</summary>
            <p>Transcription comparée le ${esc(formatDate(col.checked_on))} au texte officiel (${esc(col.against)}). Paragraphes vérifiés&nbsp;: ${esc(col.paragraphs.join(', '))}.</p>
            ${col.corrections.length ? `<ul>${col.corrections.map(c => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
          </details>` : ''}
        </div>
        <aside class="gloss gloss--aside" aria-live="polite" aria-label="Le paragraphe choisi et ses suites">${gloss(selected, 'aside')}</aside>
      </div>
    </div>
  </section>`;
}

function renderParcours() {
  const { ev, list, idx } = parcoursContext();
  const doc = data.documents?.[ev.id];
  const head = `<section class="parcours-head">
    <div class="wrap parcours-head__inner">
      <details class="toc"${state.tocOpen ? ' open' : ''}>
        <summary data-focus="toc"><span class="eyebrow">REPÈRE ${idx + 1} SUR ${list.length}</span><span class="toc__label">Tous les repères</span></summary>
        <nav class="chapters" aria-label="Liste des repères">
          ${list.map((e, i) => `<a href="${evHref(e)}" data-focus="chap-${esc(e.id)}" class="${i < idx ? 'is-done' : ''}"${i === idx ? ' aria-current="step"' : ''}>
            <span class="chapters__year">${esc(e.year)}</span><span class="chapters__short">${esc(e.short)}</span></a>`).join('')}
        </nav>
      </details>
    </div>
  </section>`;

  // Sous-page : le document du repère, paragraphe par paragraphe.
  if (doc && state.sub === 'texte') {
    return `${head}
    <div class="wrap doc-back"><a href="${evHref(ev)}" data-focus="doc-back">← Repère ${esc(ev.year)} · ${esc(ev.short)}</a></div>
    ${documentSection(ev, doc)}`;
  }

  const order = citedOrder(ev);
  const seen = new Set();
  const terms = (ev.terms || []).map(id => termById.get(id));
  const decisions = (data.decisions || []).filter(x => x.event === ev.id);
  const why1948 = events[0] === ev ? $('[data-template="why1948"]') : null;
  const more = terms.length || ev.actors?.length;
  return `${head}
  <article class="wrap reading" aria-labelledby="notice-title">
    <header class="reading__head">
      <p class="notice__meta"><span class="notice__year">${esc(ev.year)}</span><span class="eyebrow eyebrow--doc">${esc(ev.kind)}</span></p>
      <h1 id="notice-title" class="notice__title" tabindex="-1">${esc(ev.title)}</h1>
    </header>
    <div class="reading__body">
      ${noticePlace(ev)}
      <p class="notice__text">${withCalls(ev.text, order, seen)}</p>
      ${ev.context ? `<p class="notice__context">${withCalls(ev.context, order, seen)}</p>` : ''}
      ${doc ? `<p class="reading__doc"><a class="button button--outline" href="${evHref(ev)}/texte" data-focus="doc-open">Lire la ${esc(doc.title.replace(/ \(\d{4}\)$/, '').replace(/^R/, 'r'))}, paragraphe par paragraphe <span aria-hidden="true">→</span></a></p>` : ''}
      ${decisions.length ? `<div class="reading__decisions">
        <p class="eyebrow eyebrow--muted">DÉCISIONS FRANÇAISES</p>
        <ul>${decisions.map(x => `<li><a href="#/decisions/${esc(x.id)}">${esc(x.title)} · ${esc(x.date)} <span aria-hidden="true">→</span></a></li>`).join('')}</ul>
      </div>` : ''}
      <section class="reading__sources" aria-labelledby="sources-title">
        <h2 id="sources-title" class="eyebrow eyebrow--muted">SOURCES</h2>
        ${sourceButtons(order, 'ev')}
      </section>
      <div class="reading__question">
        <p class="eyebrow eyebrow--muted">QUESTION OUVERTE</p>
        <p class="notice__question">${esc(ev.question)}</p>
      </div>
      ${more ? `<details class="reading__more"${state.moreOpen ? ' open' : ''}>
        <summary data-focus="more">Pour aller plus loin</summary>
        ${terms.map(t => `<div class="term"><p class="term__title">${esc(t.title)}</p><p class="term__text">${esc(t.text)}</p></div>`).join('')}
        ${ev.actors?.length ? `<p class="eyebrow eyebrow--muted">ACTEURS CONCERNÉS</p>
        <div class="pill-group">${ev.actors.map(a => `<a class="pill" href="#/voix/${esc(a)}">${esc(data.actors[a].label)} →</a>`).join('')}</div>` : ''}
      </details>` : ''}
      ${why1948 ? why1948.outerHTML.replace('data-template="why1948"', '').replace('data-focus="home-histoire"', 'data-focus="parcours-histoire"') : ''}
    </div>
  </article>`;
}

function renderDecisions() {
  const list = data.decisions || [];
  return `<section class="wrap section" aria-labelledby="decisions-title">
    <div class="section-head">
      <div>
        <p class="eyebrow">02 · DÉCISIONS FRANÇAISES</p>
        <h1 id="decisions-title" class="display display--h1" tabindex="-1">Les actes de la France cités dans les repères</h1>
      </div>
      <p class="section-head__aside section-head__aside--wide">Pour chaque acte, son auteur, sa nature, les documents qui l’établissent et ce qu’ils ne disent pas.</p>
    </div>
    <ol class="decisions">
      ${list.map(x => {
        const ev = eventById.get(x.event);
        return `<li class="decision">
          <p class="decision__date">${esc(x.date)}</p>
          <div class="decision__body">
            <h2 id="decision-${esc(x.id)}" tabindex="-1">${esc(x.title)}</h2>
            <dl class="decision__facts">
              <div><dt>Auteur</dt><dd>${esc(x.author)}</dd></div>
              <div><dt>Nature</dt><dd>${esc(x.nature)}</dd></div>
            </dl>
            <p>${esc(x.text)}</p>
            ${x.limit ? `<p class="decision__limit"><span class="eyebrow eyebrow--muted">LIMITE</span>${esc(x.limit)}</p>` : ''}
            ${sourceButtons(x.sources, `dec-${x.id}`, true)}
            <a class="pill" href="${evHref(ev)}">Repère ${esc(ev.year)} · ${esc(ev.short)} →</a>
          </div>
        </li>`;
      }).join('')}
    </ol>
    <p class="note-box">Cette liste ne recense que les actes cités dans les repères.</p>
  </section>`;
}

function renderVoix() {
  const key = actorKeys.includes(state.param) ? state.param : actorKeys[0];
  const actor = data.actors[key];
  const related = events.filter(e => (e.actors || []).includes(key));
  return `<section class="wrap section" aria-labelledby="voix-title">
    <div class="section-head">
      <div>
        <p class="eyebrow">03 · ACTEURS ET ENQUÊTES</p>
        <h1 id="voix-title" class="display display--h1" tabindex="-1">Acteurs et enquêtes cités dans les repères</h1>
      </div>
      <p class="section-head__aside section-head__aside--wide">Pour chaque pays, des acteurs et des enquêtes, avec leurs sources.</p>
    </div>
    <div class="voix-layout">
      <nav class="tabs" aria-label="Choisir un espace">
        ${actorKeys.map((k, i) => `<a href="#/voix/${esc(k)}" data-focus="tab-${esc(k)}"${k === key ? ' aria-current="page"' : ''}><span class="tabs__n">0${i + 1}</span>${esc(data.actors[k].label)}</a>`).join('')}
      </nav>
      <div class="voix-main">
        <h2>${esc(actor.title)}</h2>
        <div class="actor-cards">
          ${actor.cards.map((c, i) => `<article class="actor-card">
            <h3>${esc(c.name)}</h3>
            <p>${esc(c.text)}</p>
            ${sourceButtons(c.sources, `card${i}`, true)}
          </article>`).join('')}
        </div>
        ${actor.note ? `<p class="note-box">${esc(actor.note)}</p>` : ''}
        ${related.length ? `<div class="related">
          <span class="eyebrow">REPÈRES LIÉS</span>
          ${related.map(e => `<a class="pill" href="${evHref(e)}">${esc(e.year + ' · ' + e.short)} →</a>`).join('')}
        </div>` : ''}
      </div>
    </div>
  </section>`;
}

function renderMots() {
  return `<section class="wrap section" aria-labelledby="mots-title">
    <p class="eyebrow">05 · LEXIQUE</p>
    <h1 id="mots-title" class="display display--h1" tabindex="-1">Les termes utilisés dans les repères</h1>
    <div class="lexique">
      ${data.terms.map(t => {
        const linked = events.filter(e => (e.terms || []).includes(t.id));
        return `<article aria-labelledby="mot-${esc(t.id)}">
          <p class="eyebrow eyebrow--doc">${esc(t.subtitle)}</p>
          <h2 id="mot-${esc(t.id)}">${esc(t.title)}</h2>
          <p>${esc(t.text)}</p>
          ${sourceButtons(t.sources, `mot-${t.id}`, true)}
          ${linked.length ? `<div class="pill-group">${linked.map(e => `<a class="pill" href="${evHref(e)}">Repère ${esc(e.year)} →</a>`).join('')}</div>` : ''}
        </article>`;
      }).join('')}
    </div>
  </section>`;
}

function renderPager(ctx) {
  let p;
  if (state.route === 'parcours') {
    const prev = ctx.list[ctx.idx - 1];
    const next = ctx.list[ctx.idx + 1];
    p = [
      prev ? evHref(prev) : '#/', prev ? 'REPÈRE PRÉCÉDENT' : 'RETOUR', prev ? `${prev.year} · ${prev.short}` : 'Les questions',
      next ? evHref(next) : '#/decisions', next ? 'REPÈRE SUIVANT' : 'DERNIER REPÈRE · CONTINUER', next ? `${next.year} · ${next.short}` : 'Décisions françaises',
    ];
  } else {
    p = SECTION_PAGER[state.route];
  }
  if (!p) return '';
  return `<nav class="pager${state.route === 'parcours' ? ' pager--parcours' : ''}" aria-label="Continuer la lecture">
    <div class="wrap pager__inner">
      <a href="${esc(p[0])}" data-focus="pager-prev"><span class="pager__sub">← ${esc(p[1])}</span><span class="pager__label">${esc(p[2])}</span></a>
      <a href="${esc(p[3])}" class="pager__next" data-focus="pager-next"><span class="pager__sub">${esc(p[4])} →</span><span class="pager__label">${esc(p[5])}</span></a>
    </div>
  </nav>`;
}

function renderBottomBar(ctx) {
  const prev = ctx.list[ctx.idx - 1];
  const next = ctx.list[ctx.idx + 1];
  el.bottomBar.innerHTML = `
    <a class="bottom-bar__prev" href="${prev ? evHref(prev) : '#/'}" aria-label="${prev ? `Repère précédent : ${esc(prev.year)}` : 'Retour aux questions'}">←</a>
    <div class="bottom-bar__mid"><span class="bottom-bar__year">${esc(ctx.ev.year)}</span><span class="bottom-bar__pos">Repère ${ctx.idx + 1} sur ${ctx.list.length}</span></div>
    <a class="bottom-bar__next" href="${next ? evHref(next) : '#/decisions'}" aria-label="${next ? `Repère suivant : ${esc(next.year)}` : 'Dernier repère, continuer vers les décisions françaises'}">→</a>`;
}

function formatDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

// Les positions de la frise passent par le CSSOM : la CSP interdit les attributs style.
function applyPositions(root) {
  $$('[data-left]', root).forEach(n => { n.style.left = Number(n.dataset.left).toFixed(2) + '%'; });
}

/* ---------- Rendu ---------- */

function render({ focusHeading = false } = {}) {
  const route = state.route;
  const active = document.activeElement;
  const focusKey = active?.dataset?.focus;

  $$('[data-route]').forEach(n => { n.hidden = n.dataset.route !== route; });
  $$('[data-nav]').forEach(a => {
    if (a.dataset.nav === route) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });

  const ctx = parcoursContext();
  const slot = $(`[data-slot="${route}"]`);
  if (route === 'parcours') slot.innerHTML = renderParcours();
  if (route === 'decisions') slot.innerHTML = renderDecisions();
  if (route === 'voix') slot.innerHTML = renderVoix();
  if (route === 'mots') slot.innerHTML = renderMots();
  if (route === 'accueil') renderHome();
  syncMaps();
  $('[data-slot="pager"]').innerHTML = renderPager(ctx);

  const isParcours = route === 'parcours';
  el.progress.hidden = !isParcours;
  el.progressBar.style.width = isParcours && ctx.list.length ? ((ctx.idx + 1) / ctx.list.length) * 100 + '%' : '0%';
  el.bottomBar.hidden = !isParcours;
  document.body.classList.toggle('has-bottom-bar', isParcours && MOBILE.matches);
  if (isParcours) renderBottomBar(ctx);
  applyPositions(document);

  const docTitle = isParcours && state.sub === 'texte' && data.documents?.[ctx.ev.id]?.title;
  document.title = docTitle ? `${docTitle} · Repères` : isParcours ? `${ctx.ev.year} · ${ctx.ev.title} · Repères` : PAGE_TITLES[route];

  if (isParcours) centerCurrentChapter();

  // Restitution du focus : même élément logique s'il existe encore, sinon titre de la page.
  const same = focusKey ? $(`[data-focus="${CSS.escape(focusKey)}"]`) : null;
  if (focusHeading) {
    const h1 = $(`[data-route="${route}"] h1`);
    if (h1) h1.focus({ preventScroll: true });
  } else if (same && active !== same) {
    same.focus({ preventScroll: true });
  }
}

function renderHome() {
  renderMapSummary($('[data-slot="map-controls"]'), $('[data-slot="map-list"]'));
  const railNode = $('[data-slot="home-rail"]');
  if (railNode.childElementCount) return;
  railNode.innerHTML = rail(null, events);
}

// Zones mises en évidence : data-map-zones sur la figure, les autres zones passent en teinte atténuée.
function syncMaps() {
  $$('[data-map-zones]').forEach(fig => {
    const on = fig.dataset.mapZones.split(' ');
    $$('[data-zone]', fig).forEach(z => z.classList.toggle('is-muted', !on.includes(z.dataset.zone)));
  });
}

function centerCurrentChapter() {
  requestAnimationFrame(() => {
    const nav = $('.chapters');
    const cur = nav && $('[aria-current]', nav);
    if (!cur) return;
    nav.scrollTo({ left: cur.offsetLeft - nav.offsetLeft - (nav.clientWidth - cur.offsetWidth) / 2, behavior: 'auto' });
  });
}

/* ---------- Volet source ---------- */

let panelReturn = null;
let panelReturnKey = null;

function setBackgroundInert(on) {
  [el.header, el.main, el.footer, el.bottomBar].forEach(n => { n.inert = on; });
}

function openSource(id, trigger) {
  const s = sourceById.get(id);
  if (!s) return;
  if (!state.sourceId) {
    panelReturn = trigger || document.activeElement;
    panelReturnKey = panelReturn?.dataset?.focus || null;
  }
  state.sourceId = id;
  el.panelBody.innerHTML = `
    <p class="eyebrow eyebrow--doc source-panel__type">${esc(s.type)}</p>
    <h2 id="panel-title">${esc(s.title)}</h2>
    <p class="source-panel__publisher">${esc(s.publisher)}</p>
    <h3>Ce que cette source documente</h3><p>${esc(s.scope)}</p>
    <h3>Où regarder</h3><p>${esc(s.locator)}</p>
    <h3>Limite</h3><p>${esc(s.limit)}</p>
    ${s.verified_on ? `<p class="source-panel__access">Passage vérifié le ${esc(formatDate(s.verified_on))}.</p>` : ''}
    <a class="source-panel__link" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer"><span>Ouvrir le document d’origine<span class="visually-hidden"> (nouvel onglet)</span></span><span aria-hidden="true">↗</span></a>`;
  el.panel.hidden = false;
  el.panel.scrollTop = 0;
  applyPanelMode();
  el.panelClose.focus();
}

// Ordinateur : dialogue non modal, la page reste utilisable. Mobile : dialogue modal, le reste est inerte.
function applyPanelMode() {
  if (!state.sourceId) return;
  const modal = MOBILE.matches;
  el.panel.setAttribute('aria-modal', String(modal));
  el.backdrop.hidden = !modal;
  setBackgroundInert(modal);
  document.body.classList.toggle('is-locked', modal);
}

function closePanel({ restoreFocus = true } = {}) {
  if (!state.sourceId) return;
  state.sourceId = null;
  el.panel.hidden = true;
  el.backdrop.hidden = true;
  setBackgroundInert(false);
  document.body.classList.remove('is-locked');
  if (restoreFocus) {
    const target = panelReturn?.isConnected ? panelReturn
      : panelReturnKey ? $(`[data-focus="${CSS.escape(panelReturnKey)}"]`) : null;
    target?.focus();
  }
  panelReturn = null;
  panelReturnKey = null;
}

/* ---------- Menu mobile ---------- */

function openMenu() {
  state.menuOpen = true;
  el.menu.hidden = false;
  el.menuToggle.setAttribute('aria-expanded', 'true');
  el.menuToggle.textContent = 'Fermer ✕';
  [el.main, el.footer, el.bottomBar].forEach(n => { n.inert = true; });
  document.body.classList.add('is-locked', 'menu-open');
  $('a', el.menu).focus();
}

function closeMenu({ restoreFocus = true } = {}) {
  if (!state.menuOpen) return;
  state.menuOpen = false;
  el.menu.hidden = true;
  el.menuToggle.setAttribute('aria-expanded', 'false');
  el.menuToggle.textContent = 'Menu';
  [el.main, el.footer, el.bottomBar].forEach(n => { n.inert = false; });
  document.body.classList.remove('is-locked', 'menu-open');
  if (restoreFocus) el.menuToggle.focus();
}

// Le menu couvre la page : le focus circule entre le bouton de fermeture et les liens du menu.
function trapMenuFocus(e) {
  const items = [el.menuToggle, ...$$('a', el.menu)];
  const first = items[0];
  const last = items[items.length - 1];
  if (!items.includes(document.activeElement)) { e.preventDefault(); first.focus(); }
  else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}


/* ---------- Événements ---------- */

function onHashChange() {
  const next = parseHash();
  const routeChanged = next.route !== state.route;
  const changed = routeChanged || next.param !== state.param || next.sub !== state.sub;
  const active = document.activeElement;
  // Onglets des acteurs : le focus reste sur l'onglet utilisé.
  const keepFocus = !!active?.closest?.('.tabs');
  closeMenu({ restoreFocus: false });
  if (changed) { closePanel({ restoreFocus: false }); state.tocOpen = false; state.moreOpen = false; }
  Object.assign(state, next);
  render({ focusHeading: changed && !keepFocus });
  // Lien vers un acte précis de la page Décisions : on s'y rend plutôt qu'en haut de page.
  const anchor = state.route === 'decisions' && state.param ? $(`#decision-${CSS.escape(state.param)}`) : null;
  if (anchor) { anchor.focus({ preventScroll: true }); anchor.scrollIntoView({ block: 'start', behavior: scrollBehavior() }); }
  else if (changed) window.scrollTo({ top: 0, behavior: scrollBehavior() });
}

document.addEventListener('click', e => {
  const t = e.target.closest('[data-source], [data-para], [data-place]');
  if (!t) return;
  if (t.dataset.place) {
    state.place = t.dataset.place === 'all' || placeById.has(t.dataset.place) ? t.dataset.place : 'all';
    render();
  } else if (t.dataset.source) openSource(t.dataset.source, t);
  else if (t.dataset.para) {
    const { ev } = parcoursContext();
    state.selPara[ev.id] = t.dataset.para;
    render();
  }
});

// Sommaire des repères et « Pour aller plus loin » : leur état d'ouverture survit aux rendus.
document.addEventListener('toggle', e => {
  if (e.target.matches?.('.toc')) { state.tocOpen = e.target.open; if (e.target.open) centerCurrentChapter(); }
  if (e.target.matches?.('.reading__more')) state.moreOpen = e.target.open;
}, true);

el.menuToggle.addEventListener('click', () => (state.menuOpen ? closeMenu() : openMenu()));
el.panelClose.addEventListener('click', () => closePanel());
el.backdrop.addEventListener('click', () => closePanel());

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (state.sourceId) { e.preventDefault(); closePanel(); return; }
    if (state.menuOpen) { e.preventDefault(); closeMenu(); return; }
  }
  if (e.key === 'Tab' && state.menuOpen) { trapMenuFocus(e); return; }
  // Raccourcis ← → : seulement dans le parcours, sans menu ni volet ouvert, hors champ de saisie.
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  if (state.menuOpen || state.sourceId || state.route !== 'parcours') return;
  if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.defaultPrevented) return;
  const tag = e.target?.tagName || '';
  if (/INPUT|TEXTAREA|SELECT/.test(tag) || e.target?.isContentEditable) return;
  if (e.target?.closest?.('.chapters')) return; // défilement horizontal natif de la liste
  // L'adresse fait foi : elle peut avoir changé avant le traitement de hashchange.
  const { list, idx } = parcoursContext(parseHash().param);
  const target = e.key === 'ArrowRight' ? list[idx + 1] : list[idx - 1];
  if (target) { e.preventDefault(); window.location.hash = evHref(target); }
});

let touch = null;
window.addEventListener('touchstart', e => { const t = e.touches[0]; touch = { x: t.clientX, y: t.clientY }; }, { passive: true });
window.addEventListener('touchend', e => {
  if (!touch || state.route !== 'parcours' || state.sourceId || state.menuOpen) { touch = null; return; }
  const t = e.changedTouches[0];
  const dx = t.clientX - touch.x;
  const dy = t.clientY - touch.y;
  touch = null;
  if (e.target.closest?.('nav, .paras, .seats')) return;
  if (Math.abs(dx) > 70 && Math.abs(dy) < 45) {
    const { list, idx } = parcoursContext(parseHash().param);
    const target = dx < 0 ? list[idx + 1] : list[idx - 1];
    if (target) window.location.hash = evHref(target);
  }
}, { passive: true });

MOBILE.addEventListener('change', () => {
  closeMenu({ restoreFocus: false });
  applyPanelMode();
  render();
});

window.addEventListener('hashchange', onHashChange);

render();
