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

  /* Uitklapmenu's: openen bij hover (CSS) en bij toetsenbordfocus. Op touch
     opent de eerste tik op een hoofdlink het menu, een tweede tik de pagina.
     Klik buiten het menu of Escape sluit alles. */
  function initDropdowns() {
    var items = document.querySelectorAll(".main-nav .has-drop");
    if (!items.length) return;
    var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    function closeAll(except) {
      items.forEach(function (li) {
        if (li === except) return;
        li.classList.remove("is-open");
        li.querySelector(".nav-link").setAttribute("aria-expanded", "false");
      });
    }
    items.forEach(function (li) {
      var link = li.querySelector(".nav-link");
      link.addEventListener("click", function (e) {
        if (canHover || li.classList.contains("is-open")) return; // gewoon naar de pagina
        e.preventDefault();
        closeAll(li);
        li.classList.add("is-open");
        link.setAttribute("aria-expanded", "true");
      });
      li.addEventListener("mouseenter", function () { link.setAttribute("aria-expanded", "true"); });
      li.addEventListener("mouseleave", function () { link.setAttribute("aria-expanded", "false"); li.classList.remove("is-open"); });
      li.addEventListener("focusout", function (e) {
        if (!li.contains(e.relatedTarget)) { li.classList.remove("is-open"); link.setAttribute("aria-expanded", "false"); }
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
