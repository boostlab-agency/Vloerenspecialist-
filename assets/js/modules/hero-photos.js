/* ==========================================================================
   Hero (homepage): foto's die rustig in elkaar overvloeien, elk met een
   langzame inzoom (CSS). Rechtsonder klikbare hoofdstukken met een lijntje
   dat meeloopt.
   - Pauzeknop (bewegend beeld moet te stoppen zijn); pauzeert ook als het
     tabblad niet zichtbaar is.
   - Speelt altijd vanzelf af; met "minder beweging" zonder inzoom.
   ========================================================================== */
(function () {
  "use strict";
  var film = document.querySelector("[data-film]");
  if (!film) return;

  var SLIDE_MS = 6500;
  var slides = film.querySelectorAll(".h-film-clip");
  var chapters = film.querySelectorAll("[data-chapter]");
  var toggle = film.querySelector("[data-film-toggle]");
  if (!slides.length || slides.length !== chapters.length) return;

  /* Speelt altijd vanzelf af (feedback 25 nov.); bij "minder beweging" zonder
     inzoom (CSS), alleen rustig overvloeien. Pauzeren kan altijd. */
  var cur = 0, elapsed = 0, last = 0;
  var paused = false, hidden = false;

  function show(i) {
    slides.forEach(function (s, k) { s.classList.toggle("is-on", k === i); });
    chapters.forEach(function (b, k) {
      b.classList.toggle("is-on", k === i);
      b.classList.toggle("is-done", k < i);
      b.setAttribute("aria-current", k === i ? "true" : "false");
      b.style.setProperty("--p", k < i ? 1 : 0);
    });
    /* volgende foto alvast laden */
    var nxt = slides[(i + 1) % slides.length];
    if (nxt.loading === "lazy") nxt.loading = "eager";
    cur = i; elapsed = 0;
  }

  function tick(t) {
    window.requestAnimationFrame(tick);
    if (!last) last = t;
    var dt = t - last; last = t;
    if (paused || hidden) return;
    elapsed += dt;
    var p = Math.min(elapsed / SLIDE_MS, 1);
    chapters[cur].style.setProperty("--p", p.toFixed(4));
    if (p >= 1) show((cur + 1) % slides.length);
  }

  function setPaused(on) {
    paused = on;
    toggle.classList.toggle("is-paused", on);
    toggle.setAttribute("aria-label", on ? "Speel de foto's af" : "Pauzeer de foto's");
    film.classList.toggle("is-paused", on);
  }

  if (toggle) toggle.addEventListener("click", function () { setPaused(!paused); });
  chapters.forEach(function (b, i) {
    b.addEventListener("click", function () { show(i); if (paused) setPaused(false); });
  });
  document.addEventListener("visibilitychange", function () { hidden = document.hidden; });

  show(0);
  window.requestAnimationFrame(tick);
})();
