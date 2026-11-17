/* ==========================================================================
   Diepte: grote foto's bewegen bij scrollen net iets langzamer dan de pagina
   (zachte parallax binnen hun kader). Gebruikt de losse CSS-eigenschappen
   `translate` en `scale`, zodat hover-zooms (transform) gewoon blijven werken.
   Met "minder beweging" gebeurt er niets.
   ========================================================================== */
(function () {
  "use strict";
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var SEL = [
    ".h-welcome-media img", ".h-inspire-item img", ".h-spread-photo img", ".h-visit-photo img",
    ".pr-hero-media > img", ".pr-intro-big", ".pr-feature-media img",
    ".pr-split-media img", ".pr-cta-media img", ".pr-mosaic .is-big img"
  ].join(",");
  var imgs = Array.prototype.slice.call(document.querySelectorAll(SEL));
  if (!imgs.length) return;

  var RANGE = 36; // maximaal aantal pixels verschuiving
  imgs.forEach(function (img) { img.classList.add("has-depth"); });

  var ticking = false;
  function update() {
    ticking = false;
    var vh = window.innerHeight;
    imgs.forEach(function (img) {
      var box = img.parentElement.getBoundingClientRect();
      if (box.bottom < -100 || box.top > vh + 100) return;
      // -1 (kader bovenin beeld) .. 1 (kader onderin beeld)
      var t = ((box.top + box.height / 2) - vh / 2) / (vh / 2 + box.height / 2);
      t = Math.max(-1, Math.min(1, t));
      img.style.translate = "0 " + (t * RANGE).toFixed(1) + "px";
    });
  }
  function onScroll() { if (!ticking) { ticking = true; window.requestAnimationFrame(update); } }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();
})();
