/* ==========================================================================
   Productpagina's: foto's en blokken schuiven zacht in beeld bij scrollen.
   Zonder JavaScript of met "minder beweging" blijft alles gewoon zichtbaar.
   ========================================================================== */
(function () {
  "use strict";
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (typeof IntersectionObserver === "undefined") return;

  var targets = document.querySelectorAll(
    ".pr-intro-media, .pr-intro-copy, .pr-type, .pr-split-media, .pr-benefit, .pr-feature-media, .pr-feature-copy, .pr-mosaic figure, .pr-review, .pr-faq-aside, .pr-related a, .pr-cta-media"
  );
  var vh = window.innerHeight;
  targets.forEach(function (el) {
    if (el.getBoundingClientRect().top < vh * 0.9) return;
    el.classList.add("pr-reveal");
  });

  /* Kaarten in een raster na elkaar. */
  document.querySelectorAll(".pr-types, .pr-benefits, .pr-mosaic, .pr-reviews, .pr-related").forEach(function (grid) {
    Array.prototype.forEach.call(grid.children, function (el, i) {
      if (el.classList.contains("pr-reveal")) el.style.transitionDelay = ((i % 4) * 0.08) + "s";
    });
  });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add("is-in");
      io.unobserve(e.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  document.querySelectorAll(".pr-reveal").forEach(function (el) { io.observe(el); });
})();
