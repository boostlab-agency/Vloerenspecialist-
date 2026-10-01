/* ==========================================================================
   Ontwerpkeuze (concept) — schakelaar aan de linkerzijkant waarmee de klant
   wisselt tussen ontwerp A (rustig en licht) en ontwerp B (uitgesproken,
   in een kader). De keuze zet data-design op <html>; design-b.css doet de
   rest. Staat bewust in <head> zonder defer, zodat de gekozen versie direct
   (zonder flits) getoond wordt. Keuze wordt onthouden per browser; met
   ?ontwerp=a of ?ontwerp=b in de URL kun je een versie direct delen.
   ========================================================================== */
(function () {
  "use strict";
  var KEY = "dvs-design";
  var root = document.documentElement;

  function read() {
    var m = /[?&]ontwerp=(a|b)\b/i.exec(window.location.search);
    if (m) return m[1].toLowerCase();
    try { return localStorage.getItem(KEY) === "b" ? "b" : "a"; } catch (e) { return "a"; }
  }
  function apply(d) {
    if (d === "b") root.setAttribute("data-design", "b");
    else root.removeAttribute("data-design");
  }
  var current = read();
  apply(current);

  function set(d) {
    current = d;
    apply(d);
    try { localStorage.setItem(KEY, d); } catch (e) { /* niet opslaan is prima */ }
    sync();
  }

  /* Alleen het filmpje van het zichtbare ontwerp afspelen (en laden). */
  function syncVideos() {
    document.querySelectorAll("video[data-design-video]").forEach(function (v) {
      if (v.getAttribute("data-design-video") === current) {
        var p = v.play();
        if (p && p.catch) p.catch(function () {});
      } else {
        v.pause();
      }
    });
  }

  var el;
  function sync() {
    syncVideos();
    if (!el) return;
    el.classList.toggle("is-b", current === "b");
    el.querySelectorAll(".ds-opt").forEach(function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-set") === current ? "true" : "false");
    });
  }

  function build() {
    el = document.createElement("div");
    el.className = "ds-switch";
    el.setAttribute("role", "group");
    el.setAttribute("aria-label", "Kies een ontwerp (concept)");
    el.innerHTML =
      '<span class="ds-label">Ontwerp</span>' +
      '<div class="ds-track">' +
        '<span class="ds-knob" aria-hidden="true"></span>' +
        '<button class="ds-opt" type="button" data-set="a" aria-label="Ontwerp A: rustig en licht">A</button>' +
        '<button class="ds-opt" type="button" data-set="b" aria-label="Ontwerp B: strak en helder">B</button>' +
      "</div>" +
      '<span class="ds-name ds-name-a">Rustig &amp; licht</span>' +
      '<span class="ds-name ds-name-b">Strak &amp; helder</span>';
    el.addEventListener("click", function (e) {
      var opt = e.target.closest(".ds-opt");
      if (opt) { set(opt.getAttribute("data-set")); return; }
      if (e.target.closest(".ds-track")) set(current === "a" ? "b" : "a");
    });
    document.body.appendChild(el);
    sync();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();
