/* ==========================================================================
   Reviews als grote, rustige quotes (ref. knulst.nl): één review tegelijk,
   stipjes eronder. Wisselt vanzelf elke 7 seconden; stopt zodra de bezoeker
   zelf een stipje kiest of met de muis op de quote staat.
   Markup: [data-quotes] > .q-track > .q-slide (+ lege .q-dots).
   ========================================================================== */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.querySelectorAll("[data-quotes]").forEach(function (root) {
    var slides = root.querySelectorAll(".q-slide");
    var dotsEl = root.querySelector(".q-dots");
    var track = root.querySelector(".q-track");
    if (slides.length < 2 || !dotsEl || !track) return;
    var cur = 0, timer = null, stopped = false;

    var dots = Array.prototype.map.call(slides, function (s, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("role", "tab");
      b.setAttribute("aria-label", "Review " + (i + 1));
      b.addEventListener("click", function () { stopped = true; stop(); go(i); });
      dotsEl.appendChild(b);
      return b;
    });

    /* Vaste hoogte = hoogste quote, zodat de pagina niet verspringt. */
    function fit() {
      var h = 0;
      slides.forEach(function (s) { h = Math.max(h, s.offsetHeight); });
      track.style.height = h + "px";
    }

    function go(i) {
      cur = (i + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.classList.toggle("is-on", k === cur); s.setAttribute("aria-hidden", k === cur ? "false" : "true"); });
      dots.forEach(function (d, k) { d.classList.toggle("is-on", k === cur); d.setAttribute("aria-selected", k === cur ? "true" : "false"); });
    }
    function play() { if (stopped || reduce || timer) return; timer = window.setInterval(function () { go(cur + 1); }, 7000); }
    function stop() { window.clearInterval(timer); timer = null; }

    root.addEventListener("mouseenter", stop);
    root.addEventListener("mouseleave", play);
    root.addEventListener("focusin", stop);
    window.addEventListener("resize", fit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    fit();
    go(0);
    play();
  });
})();
