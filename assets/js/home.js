/* ==========================================================================
   Homepage-animatie — GSAP + ScrollTrigger.
   Alleen actief op body[data-page="home"]. Respecteert reduced-motion
   en degradeert netjes als de CDN onbereikbaar is.
   ========================================================================== */
(function () {
  "use strict";
  var DVS = (window.DVS = window.DVS || {});
  if (document.body.getAttribute("data-page") !== "home") return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) document.documentElement.classList.add("reduced-motion");

  var hasGsap = typeof window.gsap !== "undefined";
  var hasST = hasGsap && typeof window.ScrollTrigger !== "undefined";
  if (hasST) gsap.registerPlugin(ScrollTrigger);

  /* Zachte cascade in de tegel- en kaartgrids: ieder item onthult een fractie
     later dan het vorige, zodat een sectie binnenkomt als één geheel in
     plaats van alles tegelijk. Moet vóór initReveals() draaien. */
  function initGridStagger() {
    document.querySelectorAll(".material-grid, .collection-grid, .tile-grid, .review-grid").forEach(function (grid) {
      var items = grid.querySelectorAll(":scope > .reveal");
      items.forEach(function (el, i) { el.style.transitionDelay = Math.min(i * 0.09, 0.45) + "s"; });
    });
  }

  function initReveals() {
    var els = document.querySelectorAll(".reveal");
    if (reduceMotion || !hasST) {
      els.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    els.forEach(function (el) {
      ScrollTrigger.create({
        trigger: el,
        start: "top 88%",
        once: true,
        onEnter: function () { el.classList.add("is-visible"); }
      });
    });
  }

  /* Splitst tekst in woord-spans zonder opmaak zoals <strong> te breken,
     zodat elk woord los kan revealen (fade + blur + optillen, gestaggerd). */
  function splitIntoWords(root) {
    function walk(node) {
      if (node.nodeType === 3) {
        var frag = document.createDocumentFragment();
        var parts = node.textContent.split(/(\s+)/);
        parts.forEach(function (part) {
          if (part === "" ) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          var span = document.createElement("span");
          span.className = "word";
          span.textContent = part;
          frag.appendChild(span);
        });
        node.parentNode.replaceChild(frag, node);
      } else if (node.nodeType === 1) {
        Array.prototype.slice.call(node.childNodes).forEach(walk);
      }
    }
    Array.prototype.slice.call(root.childNodes).forEach(walk);
  }

  /* "Wie we zijn" — scroll-gekoppelde (scrubbed), cinematische focus-reveal.
     Elk woord lost tijdens het scrollen op uit een zachte blur en blijft
     daarna scherp staan, zodat de tekst van vaag naar leesbaar gaat.
     Bewust geen verticale beweging (geen "zwevend" gevoel): alleen
     opacity + blur + een fractie schaal geven de diepte. De nadruk-woorden
     (in <strong>) krijgen daarbovenop een kleurbeweging naar het huisstijl-
     rood, samenvallend met hun scherpstelmoment. */
  function initManifestReveal() {
    var el = document.querySelector(".manifest-text.js-split-reveal");
    if (!el) return;
    splitIntoWords(el);
    var words = el.querySelectorAll(".word");

    /* Bewust óók bij prefers-reduced-motion: dit effect is alleen een
       fade van vaag naar scherp, zonder beweging. Veel Windows-pc's hebben
       "Animatie-effecten" uit staan, en dan zou de tekst anders nooit
       onthullen. Alleen de lichte schaal laten we dan weg. */
    if (!hasGsap || !hasST) {
      words.forEach(function (w) { w.classList.add("is-visible"); });
      return;
    }
    var fromScale = reduceMotion ? 1 : .985;

    /* Getriggerd op de tekst zelf (niet de hele sectie), zodat de laatste
       woorden ook op een smal scherm scherp zijn zodra ze in beeld staan. */
    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: el,
        start: "top 85%",
        end: "bottom 60%",
        scrub: 0.9
      }
    });

    var stagger = .07, fadeIn = .42;

    words.forEach(function (w, i) {
      var pos = i * stagger;
      var isAccent = !!w.closest("strong");
      tl.fromTo(w,
        { opacity: .08, filter: "blur(9px)", scale: fromScale },
        { opacity: 1, filter: "blur(0px)", scale: 1, duration: fadeIn, ease: "sine.inOut" },
        pos
      );
      if (isAccent) {
        tl.fromTo(w,
          { color: "#f4eee1" },
          { color: "#e20e18", duration: fadeIn, ease: "sine.inOut" },
          pos
        );
      }
    });
  }

  /* Zachte lichtgloed achter het manifest, drijft mee met de scroll. */
  function initManifestGlow() {
    var glow = document.querySelector(".manifest-glow");
    if (glow && !reduceMotion && hasST) {
      gsap.fromTo(glow, { yPercent: -12 }, {
        yPercent: 12, ease: "none",
        scrollTrigger: { trigger: ".manifest-chapter", start: "top bottom", end: "bottom top", scrub: 0.8 }
      });
    }
  }

  /* Zachte inzoom-uit op de hero-achtergrond. De kop zelf staat altijd
     meteen scherp — alleen dit beeldeffect hangt af van GSAP. */
  function initHeroIntro() {
    var heroMedia = document.querySelector(".hero-chapter .media video, .hero-chapter .media img");
    if (!heroMedia || reduceMotion || !hasGsap) return;
    gsap.fromTo(heroMedia, { scale: 1.18 }, { scale: 1, duration: 2.6, ease: "power2.out", delay: .2 });
  }

  /* De header blijft op de homepage permanent in de donkere, immersieve
     stijl (modus A) — geen wissel naar de lichte balk. Alleen de
     voortgangsindicator wordt bijgewerkt; het compactere uiterlijk bij
     scrollen wordt al generiek geregeld via de .is-scrolled-klasse
     (nav.js) op basis van CSS. */
  /* Zachte parallax-drift op alle grote foto's terwijl de sectie voorbijscrolt.
     De tegels in "Wat we doen" blijven hier bewust buiten: die krijgen alleen
     een rustige hover-zoom, geen extra scroll-beweging — eenvoud boven effect. */
  function initMediaParallax() {
    if (reduceMotion || !hasST) return;
    var imgs = Array.prototype.filter.call(document.querySelectorAll(".media img"), function (img) {
      return !img.closest(".tile-media");
    });
    imgs.forEach(function (img) {
      var wrap = img.closest(".media");
      gsap.fromTo(img, { yPercent: -7 }, {
        yPercent: 7, ease: "none",
        scrollTrigger: { trigger: wrap, start: "top bottom", end: "bottom top", scrub: 0.8 }
      });
    });
  }

  /* Zachte "adem"-inzoom op de grote solobeelden (signature project, showroom,
     de uitnodiging): het beeld komt licht vergroot binnen en ontspant naar
     zijn ware grootte zodra de sectie in beeld verschijnt — hetzelfde gevoel
     van diepte als de hero, maar dan getriggerd door scroll in plaats van
     page-load. Draait naast de bestaande scroll-parallax; GSAP combineert
     scale en y-drift op hetzelfde element probleemloos. */
  function initMediaBreathe() {
    if (reduceMotion || !hasGsap) return;
    var targets = document.querySelectorAll(
      ".project-media img, .showroom-media img, .invite-chapter .media video, .invite-chapter .media img"
    );
    targets.forEach(function (el) {
      var wrap = el.closest(".media");
      if (!wrap) return;
      if (hasST) {
        ScrollTrigger.create({
          trigger: wrap, start: "top 85%", once: true,
          onEnter: function () { gsap.fromTo(el, { scale: 1.12 }, { scale: 1, duration: 2.2, ease: "power2.out" }); }
        });
      }
    });
  }

  /* Knoppen die licht meebewegen met de cursor — premium detail. */
  function initMagnetic() {
    if (reduceMotion || !hasGsap) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    document.querySelectorAll(".magnetic").forEach(function (el) {
      var moveX = gsap.quickTo(el, "x", { duration: .5, ease: "power3.out" });
      var moveY = gsap.quickTo(el, "y", { duration: .5, ease: "power3.out" });
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        moveX((e.clientX - r.left - r.width / 2) * .35);
        moveY((e.clientY - r.top - r.height / 2) * .35);
      });
      el.addEventListener("mouseleave", function () { moveX(0); moveY(0); });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initGridStagger();
    initReveals();
    initManifestReveal();
    initManifestGlow();
    initHeroIntro();
    initMediaParallax();
    initMediaBreathe();
    initMagnetic();
  });
})();
