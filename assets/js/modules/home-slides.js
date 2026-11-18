/* ==========================================================================
   Homepage · Binnenkijken: fotoslider (ref. knulst.nl). Grote foto in het
   midden, buren half in beeld. Schuiven met vinger/trackpad (scroll-snap),
   de pijltjes of de pijltoetsen als de rij focus heeft. Zonder JavaScript
   blijft het een gewone, schuifbare fotorij.
   ========================================================================== */
(function () {
  "use strict";
  var root = document.querySelector("[data-slides]");
  if (!root) return;
  var track = root.querySelector(".h-slides-track");
  var slides = Array.prototype.slice.call(track.children);
  var sec = root.closest("section");
  var prev = sec.querySelector("[data-slides-prev]");
  var next = sec.querySelector("[data-slides-next]");
  if (!slides.length || !prev || !next) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function centerOf(i) { var s = slides[i]; return s.offsetLeft + s.offsetWidth / 2 - track.clientWidth / 2; }
  function current() {
    var mid = track.scrollLeft + track.clientWidth / 2, best = 0, dist = Infinity;
    slides.forEach(function (s, i) {
      var d = Math.abs(s.offsetLeft + s.offsetWidth / 2 - mid);
      if (d < dist) { dist = d; best = i; }
    });
    return best;
  }
  function go(i, smooth) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    track.scrollTo({ left: centerOf(i), behavior: smooth && !reduce ? "smooth" : "auto" });
  }
  function update() {
    var i = current();
    slides.forEach(function (s, j) { s.classList.toggle("is-on", j === i); });
    prev.disabled = i === 0;
    next.disabled = i === slides.length - 1;
  }

  prev.addEventListener("click", function () { go(current() - 1, true); });
  next.addEventListener("click", function () { go(current() + 1, true); });
  var raf = 0;
  track.addEventListener("scroll", function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); }, { passive: true });
  window.addEventListener("resize", function () { go(current(), false); });

  /* Start bij de tweede foto, zodat er links en rechts een buur in beeld staat. */
  go(1, false);
  update();
})();
