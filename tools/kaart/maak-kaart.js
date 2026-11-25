// Maakt assets/img/kaart-showroom.svg (showroomblok op de homepage).
//
// Gegevens ophalen (in deze map, niet in git):
//   osm.json   - straten via Overpass (OpenStreetMap), bbox 51.508,4.890,51.608,5.226:
//                highway (motorway t/m living_street), railway=rail, waterway=canal|river; "out geom"
// Daarna:  node tools/kaart/maak-kaart.js assets/img/kaart-showroom.svg
// Kaartgegevens (c) OpenStreetMap-bijdragers (ODbL); vermelding staat onder de kaart.
const fs = require('fs'), path = require('path');
const dir = __dirname;
const osm = JSON.parse(fs.readFileSync(path.join(dir, 'osm.json')));
const out = process.argv[2];

const W = 1600, H = 720;
// Kaartvlak: vrijwel heel Tilburg, de showroom op 70% van de breedte en 48% van de
// hoogte (daar zet de pagina de stip neer; zie .h-loc-pin in home.css).
const SHOWROOM = { lon: 5.111179, lat: 51.5655119, fx: 0.70, fy: 0.48 };
const lonSpan = 0.32, latSpan = 0.0897;
const lonMin = SHOWROOM.lon - SHOWROOM.fx * lonSpan, lonMax = lonMin + lonSpan;
const latMax = SHOWROOM.lat + SHOWROOM.fy * latSpan, latMin = latMax - latSpan;
const X = lon => (lon - lonMin) / (lonMax - lonMin) * W;
const Y = lat => (latMax - lat) / (latMax - latMin) * H;
const r1 = n => Math.round(n * 10) / 10;
const r0 = n => Math.round(n);
const inView = pts => pts.some(([x, y]) => x > -60 && x < W + 60 && y > -60 && y < H + 60);
// Lijn vereenvoudigen (Douglas-Peucker), op dit zoomniveau onzichtbaar maar
// scheelt veel bestandsgrootte.
function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Array(pts.length).fill(false); keep[0] = keep[pts.length - 1] = true;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop(); let max = 0, idx = -1;
    const [ax, ay] = pts[a], [bx, by] = pts[b], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
    for (let i = a + 1; i < b; i++) { const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / L; if (d > max) { max = d; idx = i; } }
    if (max > tol) { keep[idx] = true; stack.push([a, idx], [idx, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

const cls = {
  motorway: 'mot', trunk: 'mot', motorway_link: 'mot', trunk_link: 'mot',
  primary: 'maj', secondary: 'maj', primary_link: 'maj', secondary_link: 'maj',
  tertiary: 'mid', tertiary_link: 'mid',
  unclassified: 'min', residential: 'min', living_street: 'min'
};
const paths = { mot: [], maj: [], mid: [], min: [], rail: [], water: [] };
const named = {};
for (const e of osm.elements) {
  if (!e.geometry) continue;
  const pts = e.geometry.map(g => [X(g.lon), Y(g.lat)]);
  if (!inView(pts)) continue;
  const sp = simplify(pts, 0.8);
  const d = 'M' + sp.map(([x, y]) => r0(x) + ' ' + r0(y)).join('L');
  const t = e.tags || {};
  let c = null;
  if (t.highway) c = cls[t.highway] || null;
  else if (t.railway === 'rail') c = 'rail';
  else if (t.waterway) c = 'water';
  if (!c) continue;
  paths[c].push(d);
  if (t.name && (c === 'mot' || c === 'maj' || c === 'mid')) (named[t.name] = named[t.name] || { rank: c, segs: [] }).segs.push(pts);
}

// Straatnamen: per naam het langste rechte stuk, zonder overlap.
const rankW = { mot: 4, maj: 3, mid: 1.5 };
const cands = [];
for (const [name, v] of Object.entries(named)) {
  const tw = name.length * 7;
  // Punt op afstand s langs een lijn
  const at = (pts, cum, s) => { let i = 1; while (i < pts.length - 1 && cum[i] < s) i++; const t = (s - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1); return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t]; };
  let best = null;
  for (const pts of v.segs) {
    const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const total = cum[cum.length - 1];
    if (total < tw + 40) continue;
    // Probeer een paar posities langs de weg; kies de rechtste
    for (const f of [0.5, 0.35, 0.65, 0.25, 0.75]) {
      const s = total * f; if (s - tw / 2 < 0 || s + tw / 2 > total) continue;
      const p1 = at(pts, cum, s - tw / 2 - 10), p2 = at(pts, cum, s + tw / 2 + 10), pm = at(pts, cum, s);
      const chord = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      if (chord < (tw + 20) * 0.94) continue;
      if (pm[0] < 50 || pm[0] > W - 50 || pm[1] < 30 || pm[1] > H - 30) continue;
      const cand = { len: total, mx: pm[0], my: pm[1], a: Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) * 180 / Math.PI };
      if (!best || cand.len > best.len) best = cand;
      break;
    }
  }
  if (best) cands.push({ name, ...best, tw, score: best.len * rankW[v.rank] });
}
cands.sort((a, b) => b.score - a.score);
const placed = [], labels = [];
for (const c of cands) {
  let a = c.a; if (a > 90) a -= 180; if (a < -90) a += 180;
  const rad = Math.abs(a) * Math.PI / 180;
  const bw = c.tw * Math.cos(rad) + 18 * Math.sin(rad), bh = c.tw * Math.sin(rad) + 18 * Math.cos(rad);
  const box = [c.mx - bw / 2 - 8, c.my - bh / 2 - 8, c.mx + bw / 2 + 8, c.my + bh / 2 + 8];
  if (placed.some(b => !(box[2] < b[0] || box[0] > b[2] || box[3] < b[1] || box[1] > b[3]))) continue;
  placed.push(box);
  labels.push(`<text transform="translate(${r1(c.mx)} ${r1(c.my)}) rotate(${r1(a)})" dy="5">${c.name.replace(/&/g, '&amp;')}</text>`);
  if (labels.length >= 18) break;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Kaart van Tilburg met de ligging van de showroom aan de Jules Verneweg 7a">
<!-- Kaartgegevens © OpenStreetMap-bijdragers (ODbL); Gemaakt door tools/kaart (zie commit). -->
<style>
.bg{fill:#f3f3f1}
.water{fill:none;stroke:#e1e6e8;stroke-width:6;stroke-linecap:round;stroke-linejoin:round}
.rail{fill:none;stroke:#dbdbd8;stroke-width:1.4;stroke-dasharray:7 5}
.s-min{fill:none;stroke:#e3e3e0;stroke-width:1.1;stroke-linecap:round;stroke-linejoin:round}
.c-mot,.c-maj,.c-mid{fill:none;stroke:#d8d8d4;stroke-linecap:round;stroke-linejoin:round}
.f-mot,.f-maj,.f-mid{fill:none;stroke:#fdfdfc;stroke-linecap:round;stroke-linejoin:round}
.c-mot{stroke-width:7.4}.f-mot{stroke-width:5.4}
.c-maj{stroke-width:5.4}.f-maj{stroke-width:3.8}
.c-mid{stroke-width:3.6}.f-mid{stroke-width:2.2}
.lbl text{font:500 13px "Work Sans",Helvetica,Arial,sans-serif;fill:#a8a8a4;text-anchor:middle;letter-spacing:.02em}
</style>
<rect class="bg" width="${W}" height="${H}"/>
<path class="water" d="${paths.water.join('')}"/>
<path class="rail" d="${paths.rail.join('')}"/>
<path class="s-min" d="${paths.min.join('')}"/>
<path class="c-mid" d="${paths.mid.join('')}"/><path class="c-maj" d="${paths.maj.join('')}"/><path class="c-mot" d="${paths.mot.join('')}"/>
<path class="f-mid" d="${paths.mid.join('')}"/><path class="f-maj" d="${paths.maj.join('')}"/><path class="f-mot" d="${paths.mot.join('')}"/>
<g class="lbl">${labels.join('')}</g>
</svg>
`;
fs.writeFileSync(out, svg);
console.log('labels', labels.length, '| showroom op', r1(X(SHOWROOM.lon)), r1(Y(SHOWROOM.lat)), '| grootte', Math.round(svg.length / 1024), 'KB');
