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
})();
