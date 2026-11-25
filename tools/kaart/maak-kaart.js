// Maakt assets/img/kaart-showroom.svg (showroomblok op de homepage).
//
// Gegevens ophalen (in deze map, niet in git):
//   osm.json   - straten via Overpass (OpenStreetMap), bbox 51.547,5.034,51.576,5.127:
//                highway (motorway t/m living_street), railway=rail, waterway=canal|river; "out geom"
//   route.json - OSRM: https://router.project-osrm.org/route/v1/driving/5.0838,51.5605;5.111179,51.5655119?overview=full&geometries=geojson
// Daarna:  node tools/kaart/maak-kaart.js assets/img/kaart-showroom.svg
// Kaartgegevens (c) OpenStreetMap-bijdragers (ODbL); vermelding staat onder de kaart.
const fs = require('fs'), path = require('path');
const dir = __dirname;
const osm = JSON.parse(fs.readFileSync(path.join(dir, 'osm.json')));
const route = JSON.parse(fs.readFileSync(path.join(dir, 'route.json'))).routes[0];
const out = process.argv[2];

const W = 1600, H = 720;
// Kaartvlak (uitgezoomd, feedback 25 nov.): route rechts, veel stad eromheen.
const lonMin = 5.0095, lonMax = 5.1375, latMin = 51.5428, latMax = 51.5786;
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
  motorway: 'maj', trunk: 'maj', primary: 'maj', secondary: 'maj',
  motorway_link: 'mid', trunk_link: 'mid', primary_link: 'mid', secondary_link: 'mid', tertiary_link: 'mid', tertiary: 'mid',
  unclassified: 'min', residential: 'min', living_street: 'min'
};
const paths = { maj: [], mid: [], min: [], rail: [], water: [] };
const named = {};
for (const e of osm.elements) {
  if (!e.geometry) continue;
  const pts = e.geometry.map(g => [X(g.lon), Y(g.lat)]);
  if (!inView(pts)) continue;
  const sp = simplify(pts, 0.7);
  const d = 'M' + sp.map(([x, y]) => r0(x) + ' ' + r0(y)).join('L');
  const t = e.tags || {};
  let c = null;
  if (t.highway) c = cls[t.highway] || null;
  else if (t.railway === 'rail') c = 'rail';
  else if (t.waterway) c = 'water';
  if (!c) continue;
  paths[c].push(d);
  if (t.name && (c === 'maj' || c === 'mid' || c === 'min')) (named[t.name] = named[t.name] || { rank: c, segs: [] }).segs.push(pts);
}

// Straatnamen: per naam het langste rechte stuk, zonder overlap.
const rankW = { maj: 3, mid: 2, min: 1 };
const cands = [];
for (const [name, v] of Object.entries(named)) {
  const tw = name.length * 7.6;
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
  if (labels.length >= 26) break;
}

// Route en markeringen
const rp = route.geometry.coordinates.map(([lon, lat]) => [X(lon), Y(lat)]);
const routeD = 'M' + rp.map(([x, y]) => r1(x) + ' ' + r1(y)).join('L');
let rlen = 0; for (let i = 1; i < rp.length; i++) rlen += Math.hypot(rp[i][0] - rp[i - 1][0], rp[i][1] - rp[i - 1][1]);
const [sx, sy] = rp[0];
const [ex, ey] = [X(5.111179), Y(51.5655119)];
const tagX = ex - 205, tagY = ey - 78;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Kaart met de route van Tilburg Centraal naar de showroom aan de Jules Verneweg 7a in Tilburg">
<!-- Kaartgegevens © OpenStreetMap-bijdragers (ODbL); route via OSRM. Gemaakt door tools/kaart (zie commit). -->
<style>
.bg{fill:#f3f3f1}
.water{fill:none;stroke:#e1e6e8;stroke-width:11;stroke-linecap:round;stroke-linejoin:round}
.rail{fill:none;stroke:#d9d9d6;stroke-width:2;stroke-dasharray:10 7}
.c-maj,.c-mid,.c-min{fill:none;stroke:#dcdcd8;stroke-linecap:round;stroke-linejoin:round}
.f-maj,.f-mid,.f-min{fill:none;stroke:#fdfdfc;stroke-linecap:round;stroke-linejoin:round}
.c-maj{stroke-width:11}.f-maj{stroke-width:8.6}
.c-mid{stroke-width:7.6}.f-mid{stroke-width:5.6}
.c-min{stroke-width:4.6}.f-min{stroke-width:3.1}
.lbl text{font:500 14px "Work Sans",Helvetica,Arial,sans-serif;fill:#a8a8a4;text-anchor:middle;letter-spacing:.02em}
.glow{fill:none;stroke:#e20e18;stroke-opacity:.14;stroke-width:14;stroke-linecap:round;stroke-linejoin:round}
.route{fill:none;stroke:#e20e18;stroke-width:4;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:${Math.ceil(rlen)};stroke-dashoffset:0}
.ring{fill:#e20e18;fill-opacity:.14}
.ring2{fill:#e20e18;fill-opacity:.2}
.pulse{fill:#e20e18;fill-opacity:.25;transform-box:fill-box;transform-origin:center}
.dot{fill:#e20e18;stroke:#fff;stroke-width:4}
.tag rect{fill:#fff;stroke:#e20e18;stroke-opacity:.45}
.tag text{font:600 13px "Work Sans",Helvetica,Arial,sans-serif;letter-spacing:.18em;fill:#e20e18}
.lead{fill:none;stroke:#e20e18;stroke-width:2.4;stroke-dasharray:1 7;stroke-linecap:round}
.from text{font:600 12px "Work Sans",Helvetica,Arial,sans-serif;letter-spacing:.16em;fill:#8a8a86}
@media (prefers-reduced-motion:no-preference){
  .route{animation:draw 2.6s .4s cubic-bezier(.6,0,.2,1) both}
  .pulse{animation:pulse 2.4s ease-out infinite}
  .pulse.b{animation-delay:1.2s}
}
@keyframes draw{from{stroke-dashoffset:${Math.ceil(rlen)}}to{stroke-dashoffset:0}}
@keyframes pulse{0%{transform:scale(.35);opacity:1}100%{transform:scale(1.35);opacity:0}}
</style>
<rect class="bg" width="${W}" height="${H}"/>
<path class="water" d="${paths.water.join('')}"/>
<path class="rail" d="${paths.rail.join('')}"/>
<path class="c-min" d="${paths.min.join('')}"/><path class="c-mid" d="${paths.mid.join('')}"/><path class="c-maj" d="${paths.maj.join('')}"/>
<path class="f-min" d="${paths.min.join('')}"/><path class="f-mid" d="${paths.mid.join('')}"/><path class="f-maj" d="${paths.maj.join('')}"/>
<g class="lbl">${labels.join('')}</g>
<path class="glow" d="${routeD}"/>
<path class="route" d="${routeD}"/>
<g transform="translate(${r1(sx)} ${r1(sy)})"><circle class="ring" r="34"/><circle class="pulse" r="34"/><circle class="dot" r="9"/></g>
<g class="from" transform="translate(${r1(sx)} ${r1(sy + 58)})"><text text-anchor="middle">TILBURG CENTRAAL</text></g>
<g transform="translate(${r1(ex)} ${r1(ey)})"><circle class="ring" r="46"/><circle class="ring2" r="24"/><circle class="pulse" r="46"/><circle class="pulse b" r="46"/><circle class="dot" r="10"/></g>
<path class="lead" d="M${r1(tagX + 142)} ${r1(tagY + 17)}L${r1(ex - 14)} ${r1(ey - 6)}"/>
<g class="tag" transform="translate(${r1(tagX)} ${r1(tagY)})"><rect width="142" height="34" x=".5" y=".5"/><text x="71" y="22" text-anchor="middle">SHOWROOM</text></g>
</svg>
`;
fs.writeFileSync(out, svg);
console.log('labels', labels.length, '| routelengte', Math.round(rlen), 'px | start', r1(sx), r1(sy), '| eind', r1(ex), r1(ey), '| grootte', Math.round(svg.length / 1024), 'KB');
