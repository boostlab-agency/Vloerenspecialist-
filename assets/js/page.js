/* ==========================================================================
   Subpagina-gedrag — gedeeld door alle interne pagina's (niet de homepage,
   die heeft zijn eigen home.js). Lichtgewicht met opzet: geen GSAP-afhan-
   kelijkheid nodig voor een simpele fade-in, dus IntersectionObserver.
   ========================================================================== */
(function () {
  "use strict";
  if (document.body.getAttribute("data-page") !== "sub") return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) document.documentElement.classList.add("reduced-motion");

  /* Rustige fade + optilling zodra een blok in beeld komt — dezelfde
     visuele taal als de homepage, maar zonder scroll-storytelling. */
  function initReveals() {
    var els = document.querySelectorAll(".reveal");
    if (!els.length) return;
    if (reduceMotion || typeof IntersectionObserver === "undefined") {
      els.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    els.forEach(function (el) { io.observe(el); });
  }

  /* Zachte cascade in grids: elk kind onthult een fractie later. */
  function initGridStagger() {
    document.querySelectorAll(".spec-grid, .variant-grid, .texture-strip, .step-row").forEach(function (grid) {
      var items = grid.querySelectorAll(":scope > .reveal");
      items.forEach(function (el, i) { el.style.transitionDelay = Math.min(i * 0.08, 0.4) + "s"; });
    });
  }

  /* Magnetische knoppen — zelfde gevoel als de homepage, maar zonder GSAP:
     subpagina's laden die library niet, dus een lichte rAF-tween volstaat
     voor dit ene effect. Houdt de knoppen-ervaring overal identiek. */
  function initMagnetic() {
    if (reduceMotion || !window.matchMedia("(pointer: fine)").matches) return;
    document.querySelectorAll(".magnetic").forEach(function (el) {
      var x = 0, y = 0, tx = 0, ty = 0, raf = null;
      function tick() {
        x += (tx - x) * .18; y += (ty - y) * .18;
        el.style.transform = "translate(" + x.toFixed(2) + "px," + y.toFixed(2) + "px)";
        if (Math.abs(tx - x) > .1 || Math.abs(ty - y) > .1) { raf = requestAnimationFrame(tick); }
        else { raf = null; }
      }
      function kick() { if (!raf) raf = requestAnimationFrame(tick); }
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        tx = (e.clientX - r.left - r.width / 2) * .35;
        ty = (e.clientY - r.top - r.height / 2) * .35;
        kick();
      });
      el.addEventListener("mouseleave", function () { tx = 0; ty = 0; kick(); });
    });
  }

  /* FAQ-accordeon (Contactpagina) — één open tegelijk, met toetsenbord- en
     screenreader-ondersteuning via aria-expanded. */
  function initFaq() {
    document.querySelectorAll(".faq-item").forEach(function (item) {
      var btn = item.querySelector(".faq-q");
      if (!btn) return;
      btn.addEventListener("click", function () {
        var wasOpen = item.classList.contains("is-open");
        item.closest(".faq-list").querySelectorAll(".faq-item.is-open").forEach(function (other) {
          other.classList.remove("is-open");
          other.querySelector(".faq-q").setAttribute("aria-expanded", "false");
        });
        if (!wasOpen) {
          item.classList.add("is-open");
          btn.setAttribute("aria-expanded", "true");
        }
      });
    });
  }

  /* Contactformulier: geen backend op deze statische site — toont een
     duidelijke bevestiging i.p.v. een dode "Verstuur"-knop die niets doet. */
  function initContactForm() {
    var form = document.getElementById("contact-form");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var note = document.getElementById("contact-form-note");
      if (note) {
        note.textContent = "Bedankt! Bel ons voor een snel antwoord op 013 - 536 85 98, of mail naar info@vloerenspecialist-tilburg.nl — dit formulier is nog niet aangesloten op e-mail.";
        note.hidden = false;
      }
    });
  }

  /* Scrollspy voor een vaste inhoudsindex ([data-scrollspy] met #-links):
     markeert het onderdeel dat nu in beeld is (Behang-stalenboek). */
  function initScrollspy() {
    document.querySelectorAll("[data-scrollspy]").forEach(function (nav) {
      var links = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
      var targets = links.map(function (a) { return document.querySelector(a.getAttribute("href")); });
      if (typeof IntersectionObserver === "undefined") return;
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var i = targets.indexOf(entry.target);
          links.forEach(function (a, j) { a.classList.toggle("is-active", j === i); });
        });
      }, { rootMargin: "-45% 0px -50% 0px" });
      targets.forEach(function (t) { if (t) io.observe(t); });
    });
  }

  /* Lichtregelaar (Raamdecoratie-hero): een schuifje dat de lamellen over
     de foto open en dicht laat gaan — "speel met het licht". */
  function initLightSlider() {
    document.querySelectorAll("[data-light-slider]").forEach(function (wrap) {
      var input = wrap.querySelector("input[type=range]");
      var label = wrap.querySelector("[data-light-label]");
      if (!input) return;
      function apply() {
        var v = Number(input.value); // 0 = dicht, 100 = open
        wrap.style.setProperty("--slat-open", (v / 100).toFixed(2));
        if (label) label.textContent = v < 25 ? "Privé & gedimd" : v < 70 ? "Zacht gefilterd licht" : "Volop daglicht";
      }
      input.addEventListener("input", apply);
      apply();
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initGridStagger();
    initReveals();
    initMagnetic();
    initFaq();
    initContactForm();
    initScrollspy();
    initLightSlider();
  });
})();
