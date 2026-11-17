/* ==========================================================================
   Hero-film (homepage): een paar korte sfeerclips die in elkaar overvloeien.
   Per clip een hoofdstuk (titel + link); onderin klikbare hoofdstukken met
   een lijntje dat meeloopt. Twee <video>-elementen wisselen elkaar af, zodat
   de volgende clip al laadt terwijl de huidige speelt.
   - Pauzeknop (bewegend beeld moet te stoppen zijn), pauzeert ook als het
     tabblad niet zichtbaar is.
   - Op kleine schermen de lichtere SD-bestanden.
   - Lukt afspelen niet (autoplay geblokkeerd), dan blijft het eerste beeld
     staan en kan de bezoeker zelf op afspelen drukken.
   ========================================================================== */
(function () {
  "use strict";
  var film = document.querySelector("[data-film]");
  if (!film) return;

  var CLIP_MS = 7000;
  var vids = film.querySelectorAll(".h-film-clip");
  var chapters = film.querySelectorAll("[data-chapter]");
  var title = film.querySelector("[data-film-title]");
  var kicker = film.querySelector("[data-film-kicker]");
  var nameEl = film.querySelector("[data-film-name]");
  var moreEl = film.querySelector("[data-film-more]");
  var toggle = film.querySelector("[data-film-toggle]");
  if (vids.length < 2 || !chapters.length) return;

  var small = window.matchMedia("(max-width: 700px)").matches;
  var cur = 0, front = 0, elapsed = 0, last = 0, raf = 0;
  var paused = false, hidden = false;

  function srcOf(i) { var c = chapters[i]; return small ? c.getAttribute("data-sd") : c.getAttribute("data-hd"); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }

  function load(v, i) {
    var s = srcOf(i);
    if (v.getAttribute("src") !== s) { v.setAttribute("src", s); v.preload = "auto"; v.load(); }
    try { v.currentTime = 0; } catch (e) {}
  }

  function setChapter(i) {
    var c = chapters[i];
    chapters.forEach(function (b, k) {
      b.classList.toggle("is-on", k === i);
      b.classList.toggle("is-done", k < i);
      b.setAttribute("aria-current", k === i ? "true" : "false");
    });
    // Titel wisselt met een korte fade
    title.classList.add("is-changing");
    window.setTimeout(function () {
      kicker.textContent = pad(i + 1) + " — " + c.querySelector(".h-film-label").textContent;
      nameEl.textContent = c.getAttribute("data-name");
      moreEl.textContent = c.getAttribute("data-more");
      title.setAttribute("href", c.getAttribute("data-href"));
      title.classList.remove("is-changing");
    }, 350);
  }

  function show(i) {
    var next = 1 - front;
    var v = vids[next];
    load(v, i);
    var p = v.play();
    if (p && p.catch) p.catch(function () {});
    v.classList.add("is-on");
    vids[front].classList.remove("is-on");
    var old = vids[front];
    window.setTimeout(function () { if (!old.classList.contains("is-on")) old.pause(); }, 1300);
    front = next;
    cur = i; elapsed = 0;
    setChapter(i);
    // Volgende clip alvast laden in de achterste speler
    window.setTimeout(function () { load(vids[1 - front], (cur + 1) % chapters.length); }, 1500);
  }

  function tick(t) {
    raf = window.requestAnimationFrame(tick);
    if (!last) last = t;
    var dt = t - last; last = t;
    if (paused || hidden) return;
    var v = vids[front];
    if (v.readyState < 3) return; // wacht tot de clip echt speelt
    elapsed += dt;
    var p = Math.min(elapsed / CLIP_MS, 1);
    chapters[cur].style.setProperty("--p", p.toFixed(4));
    if (p >= 1) { chapters[cur].style.setProperty("--p", 1); show((cur + 1) % chapters.length); }
  }

  function setPaused(on) {
    paused = on;
    toggle.classList.toggle("is-paused", on);
    toggle.setAttribute("aria-label", on ? "Speel film af" : "Pauzeer film");
    film.classList.toggle("is-paused", on);
    var v = vids[front];
    if (on) v.pause(); else { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
  }

  toggle.addEventListener("click", function () { setPaused(!paused); });
  chapters.forEach(function (b, i) {
    b.addEventListener("click", function () {
      chapters.forEach(function (c, k) { c.style.setProperty("--p", k < i ? 1 : 0); });
      show(i);
      if (paused) setPaused(false);
    });
  });
  document.addEventListener("visibilitychange", function () {
    hidden = document.hidden;
    var v = vids[front];
    if (hidden) v.pause(); else if (!paused) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
  });

  // Start: eerste clip in de voorste speler
  load(vids[0], 0);
  var first = vids[0].play();
  if (first && first.catch) first.catch(function () { setPaused(true); });
  window.setTimeout(function () { load(vids[1], 1); }, 2500);
  raf = window.requestAnimationFrame(tick);
})();
