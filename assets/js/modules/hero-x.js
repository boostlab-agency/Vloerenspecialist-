/* ==========================================================================
   Hero (proef) — wisselt elke paar seconden van dia: foto in de boog, het
   rode woord in de kop en de teksten in de zwevende labels wisselen mee.
   Stipjes om zelf te kiezen; pauzeert bij aanwijzen en als het tabblad
   niet zichtbaar is.
   ========================================================================== */
(function () {
  "use strict";
  var hero = document.querySelector("[data-hx]");
  if (!hero) return;

  var groups = [
    hero.querySelectorAll(".hx-arch img"),
    hero.querySelectorAll(".hx-word em"),
    hero.querySelectorAll(".hx-chip .hx-swap b"),
    hero.querySelectorAll(".hx-tag .hx-swap b")
  ];
  var dots = hero.querySelectorAll(".hx-dots button");
  var n = dots.length, cur = 0, timer = null, DELAY = 5200;

  function show(i) {
    cur = (i + n) % n;
    groups.forEach(function (list) {
      list.forEach(function (el, j) {
        el.classList.toggle("is-on", j === cur);
        if (j !== cur && el.classList.contains("was-on")) el.classList.remove("was-on");
      });
    });
    dots.forEach(function (d, j) {
      d.classList.toggle("is-on", j === cur);
      d.setAttribute("aria-selected", j === cur ? "true" : "false");
    });
    hero.style.setProperty("--slide", cur);
  }
  function play() { stop(); timer = setInterval(function () { show(cur + 1); }, DELAY); }
  function stop() { if (timer) clearInterval(timer); timer = null; }

  dots.forEach(function (d, j) { d.addEventListener("click", function () { show(j); play(); }); });
  hero.addEventListener("mouseenter", stop);
  hero.addEventListener("mouseleave", play);
  hero.addEventListener("focusin", stop);
  document.addEventListener("visibilitychange", function () { document.hidden ? stop() : play(); });

  /* Pas starten als de laadanimatie weg is. */
  function start() { hero.classList.add("is-live"); play(); }
  if (document.documentElement.classList.contains("is-intro")) {
    var mo = new MutationObserver(function () {
      if (!document.documentElement.classList.contains("is-intro")) { mo.disconnect(); start(); }
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  } else start();
})();
