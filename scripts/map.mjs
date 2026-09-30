// Cartes de situation : SVG produits au build à partir de Natural Earth (via world-atlas), sans dépendance.
// Le fichier source est versionné dans content/cartes/ et son empreinte est vérifiée à chaque construction.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const GEO_FILE = 'content/cartes/countries-50m.json';
// world-atlas 2.0.2, countries-50m.json : Natural Earth 4.1.0, Admin 0, 1:50 m.
export const GEO_SHA256 = '04342cdc1e3016bcd7db1630de95684d67b79fe3c8c460321e87aef469502394';
// Zones que la carte sait mettre en évidence. Le corpus (places[].map_zone) ne peut citer qu'elles.
export const MAP_ZONES = ['gaza', 'cisjordanie'];
// Natural Earth réunit Gaza et la Cisjordanie dans l'entité « Palestine » : on les sépare par la longitude.
const SPLIT_LON = 34.7;

const R = Math.PI / 180;
const mercator = ([lon, lat]) => [lon * R, -Math.log(Math.tan(Math.PI / 4 + (lat * R) / 2))];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const n1 = v => Math.round(v * 10) / 10;

export async function loadGeo() {
  const text = await readFile(join(ROOT, GEO_FILE));
  const sum = createHash('sha256').update(text).digest('hex');
  if (sum !== GEO_SHA256) throw new Error(`${GEO_FILE} : empreinte inattendue (${sum}). Le fichier a changé ; mettre à jour la page Méthode avant GEO_SHA256.`);
  return decode(JSON.parse(text));
}

// Décodage TopoJSON : arcs quantifiés et codés en différences, anneaux reconstitués par concaténation.
export function decode(topo) {
  const [sx, sy] = topo.transform.scale;
  const [tx, ty] = topo.transform.translate;
  const arcs = topo.arcs.map(a => {
    let x = 0, y = 0;
    return a.map(([dx, dy]) => { x += dx; y += dy; return [x * sx + tx, y * sy + ty]; });
  });
  const arc = i => (i < 0 ? arcs[~i].slice().reverse() : arcs[i]);
  const ring = ids => ids.flatMap((i, k) => (k ? arc(i).slice(1) : arc(i)));
  const polygons = g => (g.type === 'Polygon' ? [g.arcs.map(ring)] : g.type === 'MultiPolygon' ? g.arcs.map(p => p.map(ring)) : []);
  const countries = topo.objects.countries.geometries.map(g => ({ name: g.properties.name, polygons: polygons(g) }));

  const pal = countries.find(c => c.name === 'Palestine');
  if (!pal) throw new Error('carte : entité « Palestine » absente du jeu de données');
  const meanLon = p => p[0].reduce((a, c) => a + c[0], 0) / p[0].length;
  const zones = {
    gaza: pal.polygons.filter(p => meanLon(p) < SPLIT_LON),
    cisjordanie: pal.polygons.filter(p => meanLon(p) >= SPLIT_LON),
  };
  // Garde-fous : si le fichier change de forme, le build s'arrête au lieu de dessiner une zone fausse.
  checkZone(zones.gaza, 'gaza', [34.1, 31.1, 34.7, 31.7]);
  checkZone(zones.cisjordanie, 'cisjordanie', [34.8, 31.2, 35.7, 32.7]);
  return { countries: countries.filter(c => c !== pal), zones };
}

function checkZone(polys, name, [x0, y0, x1, y1]) {
  if (!polys.length) throw new Error(`carte : zone ${name} vide`);
  for (const p of polys) for (const [x, y] of p[0]) {
    if (x < x0 || x > x1 || y < y0 || y > y1) throw new Error(`carte : zone ${name} hors de son emprise attendue (${x}, ${y})`);
  }
}

// Projection de Mercator ajustée à un cadre, avec découpe des polygones au cadre (Sutherland-Hodgman).
function makeProjection({ width, height, bbox: [lon0, lat0, lon1, lat1], center }) {
  const [ax, ay] = mercator([lon0, lat1]);
  const [bx, by] = mercator([lon1, lat0]);
  const k = center ? width / (bx - ax) : Math.min(width / (bx - ax), height / (by - ay));
  let dx = -ax * k + (width - (bx - ax) * k) / 2;
  let dy = -ay * k + (height - (by - ay) * k) / 2;
  if (center) { const [, cy] = mercator(center); dy = height / 2 - cy * k; }
  const project = p => { const [x, y] = mercator(p); return [x * k + dx, y * k + dy]; };
  // Échelle au point : pixels par kilomètre à une latitude donnée.
  const pxPerKm = lat => (k / 6371) / Math.cos(lat * R);
  return { project, pxPerKm };
}

function clipRing(points, [x0, y0, x1, y1]) {
  const edges = [
    [p => p[0] >= x0, (a, b) => [x0, a[1] + ((b[1] - a[1]) * (x0 - a[0])) / (b[0] - a[0])]],
    [p => p[0] <= x1, (a, b) => [x1, a[1] + ((b[1] - a[1]) * (x1 - a[0])) / (b[0] - a[0])]],
    [p => p[1] >= y0, (a, b) => [a[0] + ((b[0] - a[0]) * (y0 - a[1])) / (b[1] - a[1]), y0]],
    [p => p[1] <= y1, (a, b) => [a[0] + ((b[0] - a[0]) * (y1 - a[1])) / (b[1] - a[1]), y1]],
  ];
  let out = points;
  for (const [inside, cut] of edges) {
    const input = out;
    out = [];
    input.forEach((cur, i) => {
      const prev = input[(i + input.length - 1) % input.length];
      if (inside(cur)) { if (!inside(prev)) out.push(cut(prev, cur)); out.push(cur); }
      else if (inside(prev)) out.push(cut(prev, cur));
    });
    if (!out.length) break;
  }
  return out;
}

function pathData(polygons, project, clip) {
  let d = '';
  for (const poly of polygons) for (const ring of poly) {
    const pts = clipRing(ring.map(project), clip).map(([x, y]) => [n1(x), n1(y)]);
    const kept = pts.filter((p, i) => !i || p[0] !== pts[i - 1][0] || p[1] !== pts[i - 1][1]);
    if (kept.length < 3) continue;
    d += 'M' + kept.map(p => p.join(' ')).join('L') + 'Z';
  }
  return d;
}

// Largeur approximative d'un libellé (DM Sans) pour le garder dans le cadre, sans mesure dans un navigateur.
const textWidth = (t, size, tracking = 0) => t.length * size * (0.58 + tracking);

function label(text, [x, y], { cls, size, anchor = 'middle', tracking = 0, width, height, margin = 6 }) {
  const w = textWidth(text, size, tracking);
  const left = anchor === 'start' ? x : anchor === 'end' ? x - w : x - w / 2;
  const shift = left < margin ? margin - left : left + w > width - margin ? width - margin - (left + w) : 0;
  const yy = Math.min(Math.max(y, margin + size), height - margin);
  return `<text class="${cls}" x="${n1(x + shift)}" y="${n1(yy)}" text-anchor="${anchor}">${esc(text)}</text>`;
}

function base(geo, opts) {
  const { width, height } = opts;
  const { project, pxPerKm } = makeProjection(opts);
  const clip = [-10, -10, width + 10, height + 10];
  const countries = geo.countries
    .map(c => pathData(c.polygons, project, clip))
    .filter(Boolean)
    .map(d => `<path class="map__land" d="${d}"/>`).join('');
  const zones = Object.fromEntries(MAP_ZONES.map(z => [z, pathData(geo.zones[z], project, clip)]));
  return { project, pxPerKm, countries, zones };
}

// Grande carte d'accueil, sur fond encre. Les zones portent data-place pour le délégué de clic d'app.js.
export function regionSvg(geo, { width = 460, height = 540 } = {}) {
  const opts = { width, height, bbox: [32.8, 29.4, 36.7, 33.4], center: [34.75, 31.4] };
  const { project, pxPerKm, countries, zones } = base(geo, opts);
  const at = (lon, lat) => project([lon, lat]);
  const L = (t, lon, lat, o) => label(t, at(lon, lat), { width, height, ...o });
  const country = { cls: 'map__label', size: 11, tracking: 0.08 };
  const zoneLabel = { cls: 'map__label map__label--zone', size: 14 };
  const line = (a, b) => `<line class="map__leader" x1="${n1(a[0])}" y1="${n1(a[1])}" x2="${n1(b[0])}" y2="${n1(b[1])}"/>`;
  const [s0x, s0y] = at(32.95, 29.62);
  const km = 50;
  const s1x = s0x + km * pxPerKm(31.5);
  return `<svg class="map map--dark" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="map-region-title">
<title id="map-region-title">Carte de situation de la bande de Gaza et de la Cisjordanie, entre la mer Méditerranée, l’Égypte, Israël et la Jordanie.</title>
<rect class="map__sea" width="${width}" height="${height}"/>
${countries}
${MAP_ZONES.map(z => `<path class="map__zone" data-zone="${z}" data-place="${z}" d="${zones[z]}"/>`).join('')}
<path class="map__hit" data-place="gaza" d="${zones.gaza}"/>
${L('MER MÉDITERRANÉE', 33.7, 32.55, { cls: 'map__label map__label--sea', size: 10, tracking: 0.12 })}
${L('ÉGYPTE', 33.6, 30.1, country)}${L('ISRAËL', 34.95, 30.55, country)}${L('JORDANIE', 36.2, 31.0, country)}${L('LIBAN', 35.75, 33.3, country)}${L('SYRIE', 36.45, 32.95, country)}
${line(at(34.3, 31.45), at(33.9, 31.6))}${L('Bande de Gaza', 33.86, 31.64, { ...zoneLabel, anchor: 'end' })}
${line(at(35.5, 32.1), at(35.9, 32.12))}${L('Cisjordanie', 35.94, 32.1, { ...zoneLabel, anchor: 'start' })}
<line class="map__scale" x1="${n1(s0x)}" y1="${n1(s0y)}" x2="${n1(s1x)}" y2="${n1(s0y)}"/>
<text class="map__label map__label--scale" x="${n1(s0x)}" y="${n1(s0y - 6)}">${km} km</text>
</svg>`;
}

// Miniature des notices, sur fond clair. app.js règle data-focus selon les lieux de la notice.
export function miniSvg(geo, { width = 200, height = 250 } = {}) {
  const opts = { width, height, bbox: [34.1, 30.9, 35.95, 32.7] };
  const { project, countries, zones } = base(geo, opts);
  const L = (t, lon, lat, o) => label(t, project([lon, lat]), { width, height, margin: 4, ...o });
  return `<svg class="map map--light" viewBox="0 0 ${width} ${height}" role="img">
<rect class="map__sea" width="${width}" height="${height}"/>
${countries}
${MAP_ZONES.map(z => `<path class="map__zone" data-zone="${z}" d="${zones[z]}"/>`).join('')}
${L('Méditerranée', 34.3, 32.45, { cls: 'map__label map__label--sea', size: 9 })}
${L('ISRAËL', 34.75, 30.98, { cls: 'map__label', size: 9, tracking: 0.08 })}
${L('JORDANIE', 35.72, 31.05, { cls: 'map__label', size: 9, tracking: 0.08 })}
${L('Gaza', 34.3, 31.12, { cls: 'map__label map__label--zone', size: 10 })}
${L('Cisjordanie', 35.25, 32.62, { cls: 'map__label map__label--zone', size: 10 })}
<rect class="map__frame" width="${width}" height="${height}"/>
</svg>`;
}
