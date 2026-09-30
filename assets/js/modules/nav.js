/* ==========================================================================
   Navigatie-gedrag — header-schaduw bij scrollen, uitklapmenu's in de
   hoofdnavigatie (muis, toetsenbord én touch) en het menupaneel op
   kleinere schermen. Werkt met de door header.js geïnjecteerde markup.
   ========================================================================== */
(function () {
  "use strict";

  function initHeaderScrollState() {
    var header = document.querySelector(".site-header");
    if (!header) return;
    function onScroll() { header.classList.toggle("is-scrolled", window.scrollY > 8); }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* Uitklapmenu's: klappen open (en weer dicht) bij een klik op het
     hoofditem — muis, touch en toetsenbord gelijk. Eén menu tegelijk;
     klik buiten het menu, focus weg of Escape sluit alles. */
  function initDropdowns() {
    var items = document.querySelectorAll(".main-nav .has-drop");
    if (!items.length) return;

    function setOpen(li, open) {
      li.classList.toggle("is-open", open);
      li.querySelector(".nav-trigger").setAttribute("aria-expanded", open ? "true" : "false");
    }
    function closeAll(except) {
      items.forEach(function (li) { if (li !== except) setOpen(li, false); });
    }
    items.forEach(function (li) {
      var trigger = li.querySelector(".nav-trigger");
      trigger.addEventListener("click", function () {
        var open = !li.classList.contains("is-open");
        closeAll(li);
        setOpen(li, open);
      });
      li.addEventListener("focusout", function (e) {
        if (e.relatedTarget && !li.contains(e.relatedTarget)) setOpen(li, false);
      });
    });
    document.addEventListener("click", function (e) {
      if (!e.target.closest(".main-nav")) closeAll(null);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeAll(null);
    });
  }

  /* Menupaneel (telefoon/tablet). */
  function initMenuPanel() {
    var toggle = document.getElementById("overlay-toggle");
    var nav = document.getElementById("overlay-nav");
    var closeBtn = document.getElementById("overlay-close");
    var backdrop = document.getElementById("overlay-backdrop");
    if (!toggle || !nav) return;

    function open() {
      nav.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
      document.documentElement.style.overflow = "hidden";
    }
    function close() {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      document.documentElement.style.overflow = "";
    }
    toggle.addEventListener("click", function () { nav.classList.contains("is-open") ? close() : open(); });
    if (closeBtn) closeBtn.addEventListener("click", close);
    if (backdrop) backdrop.addEventListener("click", close);
    nav.querySelectorAll(".m-nav a").forEach(function (a) { a.addEventListener("click", close); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) close();
    });
    // Accordeon: één open categorie tegelijk.
    var accs = nav.querySelectorAll(".m-cat-acc");
    accs.forEach(function (d) {
      d.addEventListener("toggle", function () {
        if (!d.open) return;
        accs.forEach(function (other) { if (other !== d) other.open = false; });
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initHeaderScrollState();
    initDropdowns();
    initMenuPanel();
  });
})();
