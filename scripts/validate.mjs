// Contrôles du corpus content/reperes.json. Retourne { errors, warnings } sans lever d'exception.

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const STATUSES = ['draft_pending_independent_review'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DASHES = /[\u2013\u2014]/; // demi-cadratin et cadratin, exclus par la charte éditoriale

// externalRefs : identifiants de sources cités hors du corpus (gabarit HTML).
export function validateCorpus(d, { externalRefs = [] } = {}) {
  const errors = [];
  const warnings = [];
  const err = msg => errors.push(msg);

  for (const key of ['schema_version', 'title', 'scope', 'editorial_status', 'sources', 'events', 'actors', 'terms', 'threads']) {
    if (d[key] === undefined) err(`champ racine manquant : ${key}`);
  }
  if (errors.length) return { errors, warnings };
  if (!STATUSES.includes(d.editorial_status)) err(`editorial_status inconnu : ${d.editorial_status}`);

  const uniqueIds = (items, label) => {
    const seen = new Set();
    for (const item of items) {
      if (!item.id || !ID.test(item.id)) err(`${label} : identifiant invalide « ${item.id} »`);
      if (seen.has(item.id)) err(`${label} : identifiant en double « ${item.id} »`);
      seen.add(item.id);
    }
    return seen;
  };
  const sourceIds = uniqueIds(d.sources, 'source');
  const eventIds = uniqueIds(d.events, 'événement');
  const termIds = uniqueIds(d.terms, 'terme');
  const threadIds = uniqueIds(d.threads, 'fil');
  const actorIds = new Set(Object.keys(d.actors));
  for (const id of actorIds) if (!ID.test(id)) err(`acteur : identifiant invalide « ${id} »`);

  const used = new Set();
  const refSources = (ids, where) => {
    if (!Array.isArray(ids)) { err(`${where} : liste de sources absente`); return; }
    for (const id of ids) {
      if (!sourceIds.has(id)) err(`${where} : source inconnue « ${id} »`);
      used.add(id);
    }
  };

  for (const s of d.sources) {
    for (const f of ['publisher', 'title', 'url', 'type', 'scope', 'locator', 'access', 'limit']) {
      if (!s[f]) err(`source ${s.id} : champ « ${f} » vide`);
    }
    let url;
    try { url = new URL(s.url); } catch { err(`source ${s.id} : URL invalide « ${s.url} »`); continue; }
    if (url.protocol !== 'https:') err(`source ${s.id} : URL non HTTPS « ${s.url} »`);
    if (url.pathname === '/' && !url.search) warnings.push(`source ${s.id} : l'URL pointe vers la racine d'un site (${s.url})`);
    if (s.verified_on && !ISO_DATE.test(s.verified_on)) err(`source ${s.id} : verified_on doit être une date AAAA-MM-JJ`);
  }

  let lastYear = -Infinity;
  for (const e of d.events) {
    const where = `événement ${e.id}`;
    for (const f of ['year', 'short', 'kind', 'title', 'text', 'context', 'question']) {
      if (!e[f]) err(`${where} : champ « ${f} » vide`);
    }
    if (!/^\d{4}$/.test(e.year)) err(`${where} : année invalide « ${e.year} »`);
    if (Number(e.year) < lastYear) err(`${where} : les événements doivent être classés par année`);
    lastYear = Number(e.year);
    refSources(e.sources, where);
    if (!Array.isArray(e.threads) || !e.threads.length) err(`${where} : au moins un fil de lecture attendu`);
    for (const t of e.threads || []) if (!threadIds.has(t)) err(`${where} : fil inconnu « ${t} »`);
    for (const t of e.terms || []) if (!termIds.has(t)) err(`${where} : terme inconnu « ${t} »`);
    for (const a of e.actors || []) if (!actorIds.has(a)) err(`${where} : acteur inconnu « ${a} »`);
  }

  for (const [key, a] of Object.entries(d.actors)) {
    for (const f of ['label', 'title', 'note']) if (!a[f]) err(`acteur ${key} : champ « ${f} » vide`);
    (a.cards || []).forEach((c, i) => refSources(c.sources, `acteur ${key}, carte ${i + 1}`));
  }
  for (const t of d.terms) refSources(t.sources, `terme ${t.id}`);

  for (const [evId, doc] of Object.entries(d.documents || {})) {
    const where = `document ${evId}`;
    if (!eventIds.has(evId)) err(`${where} : aucun événement ne porte cet identifiant`);
    refSources([doc.sourceText, doc.sourceVote], where);
    const voters = [...doc.vote.pour, ...doc.vote.contre, ...doc.vote.abstention];
    if (new Set(voters).size !== voters.length) err(`${where} : un membre apparaît deux fois dans le vote`);
    const ns = doc.paragraphs.map(p => p.n);
    if (new Set(ns).size !== ns.length) err(`${where} : numéro de paragraphe en double`);
    if (doc.defaultParagraph && !ns.includes(doc.defaultParagraph)) err(`${where} : defaultParagraph « ${doc.defaultParagraph} » absent des extraits`);
    for (const p of doc.paragraphs) {
      for (const f of ['text', 'addressee', 'gloss', 'question']) if (!p[f]) err(`${where}, § ${p.n} : champ « ${f} » vide`);
      refSources(p.followups.map(f => f.source), `${where}, § ${p.n}`);
    }
    if (doc.collation && !ISO_DATE.test(doc.collation.checked_on || '')) err(`${where} : collation.checked_on doit être une date AAAA-MM-JJ`);
  }

  refSources(externalRefs, 'gabarit HTML');
  for (const id of sourceIds) if (!used.has(id)) warnings.push(`source ${id} : jamais citée`);

  // Règle de la charte : pas de tiret cadratin ni demi-cadratin dans les textes.
  walkStrings(d, (value, path) => { if (DASHES.test(value)) err(`${path} : tiret cadratin ou demi-cadratin`); });

  return { errors, warnings };
}

function walkStrings(node, visit, path = 'corpus') {
  if (typeof node === 'string') visit(node, path);
  else if (Array.isArray(node)) node.forEach((v, i) => walkStrings(v, visit, `${path}[${i}]`));
  else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) walkStrings(v, visit, `${path}.${k}`);
}
