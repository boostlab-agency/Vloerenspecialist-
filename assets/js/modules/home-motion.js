/* ==========================================================================
   Homepage-beweging: blokken schuiven zacht in beeld bij
   scrollen, kaarten in een raster na elkaar, en de kerncijfers tellen op.
   Zonder JavaScript of met "minder beweging" blijft alles gewoon zichtbaar.
   ========================================================================== */
(function () {
  "use strict";
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (typeof IntersectionObserver === "undefined") return;

  var targets = document.querySelectorAll(
    ".h-section .h-head, .h-welcome-media, .h-map, .h-welcome-copy, .h-card, .h-review, .h-inspire-item"
  );

  /* Wat al in beeld staat bij het laden niet eerst verbergen. */
  var vh = window.innerHeight;
  targets.forEach(function (el) {
    if (el.getBoundingClientRect().top < vh * 0.9) return;
    el.classList.add("m-reveal");
  });
  document.documentElement.classList.add("js-motion");

  /* Cascade binnen een raster: elke kaart een fractie later. */
  document.querySelectorAll(".h-grid, .h-inspire-grid").forEach(function (grid) {
    Array.prototype.forEach.call(grid.children, function (el, i) {
      if (el.classList.contains("m-reveal")) el.style.transitionDelay = ((i % 4) * 0.1) + "s";
    });
  });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add("is-in");
      io.unobserve(e.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  document.querySelectorAll(".m-reveal").forEach(function (el) { io.observe(el); });

  /* Kerncijfers tellen op zodra ze in beeld komen. */
  function countUp(el) {
    var end = parseInt(el.getAttribute("data-count"), 10);
    var nl = el.getAttribute("data-format") === "nl";
    var start = null, dur = 1600;
    function fmt(n) { return nl ? n.toLocaleString("nl-NL") : String(n); }
    function step(t) {
      if (start === null) start = t;
      var p = Math.min((t - start) / dur, 1);
      el.textContent = fmt(Math.round(end * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(step);
    }
    el.textContent = fmt(0);
    requestAnimationFrame(step);
  }
  var cio = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      countUp(e.target);
      cio.unobserve(e.target);
    });
  }, { threshold: 0.6 });
  document.querySelectorAll("[data-count]").forEach(function (el) { cio.observe(el); });
})();
