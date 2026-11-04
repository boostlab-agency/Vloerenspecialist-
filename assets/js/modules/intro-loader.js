/* ==========================================================================
   Laadanimatie van het logo — bij het eerste bezoek (per browsersessie) en
   bij verversen van de pagina. Niet bij gewoon doorklikken tussen pagina's,
   dan zou het snel irritant worden.
   Verloop: de vijf rode tegels uit het logo worden één voor één "gelegd",
   daarna schuift de woordmerktekst in beeld met een knipoog-regel eronder.
   Tot slot schuift het scherm omhoog, met een dun rood randje erachter.
   Klik of Escape slaat de animatie over; bij "minder beweging" komt hij niet.
   Staat in <head> zonder defer, zodat het scherm er meteen ligt (geen flits).
   Zet ook DVS.logoSvg / DVS.toInlineLogo klaar voor het logo in de header.
   ========================================================================== */
(function () {
  "use strict";
  var DVS = (window.DVS = window.DVS || {});
  var root = document.documentElement;

  /* Logo-svg één keer ophalen; de header gebruikt dezelfde tekst. */
  DVS.logoSvg = window.fetch
    ? fetch("/assets/img/logo-dark.svg").then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
    : Promise.reject(new Error("geen fetch"));
  DVS.logoSvg.catch(function () {});

  /* Svg-tekst omzetten naar een inline element zonder eigen <style>
     (die zou anders over de hele pagina gelden). Kleuren komen uit CSS. */
  DVS.toInlineLogo = function (txt) {
    try {
      var doc = new DOMParser().parseFromString(txt, "image/svg+xml");
      var svg = doc.documentElement;
      if (!svg || svg.nodeName.toLowerCase() !== "svg") return null;
      var defs = svg.querySelector("defs");
      if (defs) defs.parentNode.removeChild(defs);
      svg.removeAttribute("id");
      svg.removeAttribute("data-name");
      var NS = "http://www.w3.org/2000/svg";
      var word = doc.createElementNS(NS, "g");
      word.setAttribute("class", "logo-word");
      /* Rode vormen links (x < 420) zijn de tegels van het beeldmerk; het
         rode "Tilburg" hoort bij de tekst. */
      var i = 0;
      Array.prototype.slice.call(svg.children).forEach(function (p) {
        var red = p.getAttribute("class") === "cls-3";
        var x = parseFloat((p.getAttribute("d") || "").replace(/^M\s*/i, ""));
        if (red && x < 420) {
          p.setAttribute("class", "logo-tile");
          p.style.setProperty("--i", i++);
          return;
        }
        p.setAttribute("class", red ? "logo-red" : "logo-ink");
        word.appendChild(p);
      });
      svg.appendChild(word);
      svg.setAttribute("class", "logo-inline");
      return document.importNode(svg, true);
    } catch (e) { return null; }
  };

  /* Wanneer tonen? */
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var nav = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
  var isReload = nav ? nav.type === "reload" : (performance.navigation && performance.navigation.type === 1);
  var seen = false;
  try { seen = sessionStorage.getItem("dvs-intro") === "1"; } catch (e) {}
  var forced = /[?&]intro\b/.test(location.search);
  if (reduce || (!forced && seen && !isReload)) return;
  try { sessionStorage.setItem("dvs-intro", "1"); } catch (e) {}

  var el = document.createElement("div");
  el.className = "intro";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML =
    '<div class="intro-edge"></div>' +
    '<div class="intro-panel">' +
      '<div class="intro-logo"></div>' +
      '<div class="intro-bar"><span></span></div>' +
      '<p class="intro-line"><span class="a">Even de vloer leggen…</span><span class="b">Welkom!</span></p>' +
    "</div>";
  root.classList.add("is-intro");
  root.appendChild(el);

  var started = Date.now();
  var MIN = 2300, MAX = 4000, done = false;

  DVS.logoSvg.then(function (txt) {
    var svg = DVS.toInlineLogo(txt);
    if (svg) el.querySelector(".intro-logo").appendChild(svg);
  }).catch(function () {}).then(function () {
    requestAnimationFrame(function () { el.classList.add("is-ready"); });
  });

  function finish() {
    if (done) return;
    done = true;
    el.classList.add("is-leaving");
    root.classList.remove("is-intro");
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 1200);
  }
  function whenLoaded() {
    var wait = Math.max(0, MIN - (Date.now() - started));
    setTimeout(finish, wait);
  }
  if (document.readyState === "complete") whenLoaded();
  else window.addEventListener("load", whenLoaded);
  setTimeout(finish, MAX);

  el.addEventListener("click", finish);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") finish(); });
})();
