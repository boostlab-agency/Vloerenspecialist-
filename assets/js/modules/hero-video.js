/* ==========================================================================
   Hero-filmpje — pauzeer-/afspeelknop (bewegend beeld moet te stoppen zijn)
   en een vangnet voor browsers die autoplay blokkeren: dan blijft de
   posterafbeelding staan en toont de knop "afspelen".
   ========================================================================== */
(function () {
  "use strict";
  document.querySelectorAll("[data-video-toggle]").forEach(function (btn) {
    var video = btn.parentElement.querySelector("video");
    if (!video) return;
    function sync() {
      btn.classList.toggle("is-paused", video.paused);
      btn.setAttribute("aria-label", video.paused ? "Speel filmpje af" : "Pauzeer filmpje");
    }
    btn.addEventListener("click", function () {
      if (video.paused) video.play().catch(function () {}); else video.pause();
    });
    video.addEventListener("play", sync);
    video.addEventListener("pause", sync);
    var p = video.play && video.play();
    if (p && p.catch) p.catch(sync);
    sync();
  });

  /* Label op het filmpje: wisselt rustig tussen een paar feiten. Het rode
     lijntje onderaan loopt mee tot het volgende feit. Pauzeert als het
     filmpje gepauzeerd wordt of het tabblad niet zichtbaar is. */
  document.querySelectorAll("[data-hero-facts]").forEach(function (label) {
    var facts = label.querySelectorAll(".h-hero-facts > span");
    if (facts.length < 2) return;
    var MS = 5000, cur = 0, timer = null;
    var video = label.closest(".h-hero-media") && label.closest(".h-hero-media").querySelector("video");
    label.style.setProperty("--fact-ms", MS + "ms");

    function restartBar() {
      label.classList.remove("is-timing");
      void label.offsetWidth; // herstart de transitie
      label.classList.add("is-timing");
    }
    function next() {
      var prev = facts[cur];
      cur = (cur + 1) % facts.length;
      prev.classList.remove("is-on");
      prev.classList.add("is-out");
      facts[cur].classList.remove("is-out");
      facts[cur].classList.add("is-on");
      label.classList.add("is-switching");
      window.setTimeout(function () { prev.classList.remove("is-out"); label.classList.remove("is-switching"); }, 700);
      restartBar();
    }
    function play() { if (timer) return; restartBar(); timer = window.setInterval(next, MS); }
    function stop() { window.clearInterval(timer); timer = null; label.classList.remove("is-timing"); }

    function start() {
      play();
      document.addEventListener("visibilitychange", function () { document.hidden ? stop() : play(); });
      if (video) { video.addEventListener("pause", stop); video.addEventListener("play", play); }
    }
    // Pas beginnen als de laadanimatie weg is.
    var root = document.documentElement;
    if (root.classList.contains("is-intro") && window.MutationObserver) {
      var mo = new MutationObserver(function () {
        if (!root.classList.contains("is-intro")) { mo.disconnect(); window.setTimeout(start, 1200); }
      });
      mo.observe(root, { attributes: true, attributeFilter: ["class"] });
    } else window.setTimeout(start, 1200);
  });
})();
