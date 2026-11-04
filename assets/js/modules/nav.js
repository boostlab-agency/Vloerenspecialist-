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
    var lastY = window.scrollY, ticking = false;
    function update() {
      ticking = false;
      var y = window.scrollY;
      header.classList.toggle("is-scrolled", y > 8);
      /* Wegschuiven bij naar beneden scrollen, terug bij omhoog — niet als
         er een uitklapmenu open is. */
      var menuOpen = header.querySelector(".nav-item.is-open");
      if (y > 320 && y > lastY + 6 && !menuOpen) header.classList.add("is-hidden");
      else if (y < lastY - 6 || y <= 320) header.classList.remove("is-hidden");
      lastY = y;
      /* Rood voortgangslijntje onder de header. */
      var max = document.documentElement.scrollHeight - window.innerHeight;
      header.style.setProperty("--progress", max > 0 ? Math.min(y / max, 1).toFixed(4) : 0);
    }
    update();
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    header.addEventListener("focusin", function () { header.classList.remove("is-hidden"); });
  }

  /* Uitklapmenu's: met de muis klappen ze direct open bij aanwijzen (en
     dicht bij weggaan, met een korte marge). Een klik op het hoofditem gaat
     dan naar de overzichtspagina. Op touch en met het toetsenbord klapt een
     klik/Enter het menu open en dicht. Eén menu tegelijk; Escape of een
     klik buiten het menu sluit alles. */
  function initDropdowns() {
    var items = document.querySelectorAll(".main-nav .has-drop");
    if (!items.length) return;

    var header = document.querySelector(".site-header");
    var canHover = window.matchMedia("(hover: hover) and (pointer: fine)");
    function setOpen(li, open) {
      if (open && header) {
        // Lijst laten beginnen recht onder de tekst van het menu-item.
        var x = li.querySelector(".nav-trigger").getBoundingClientRect().left - header.getBoundingClientRect().left + 12;
        li.querySelector(".nav-drop").style.setProperty("--drop-x", Math.round(x) + "px");
      }
      li.classList.toggle("is-open", open);
      if (!open) li.removeAttribute("data-hover-open");
      li.querySelector(".nav-trigger").setAttribute("aria-expanded", open ? "true" : "false");
    }
    function closeAll(except) {
      items.forEach(function (li) { if (li !== except) setOpen(li, false); });
    }
    items.forEach(function (li) {
      var trigger = li.querySelector(".nav-trigger");
      var timer;
      li.addEventListener("mouseenter", function () {
        if (!canHover.matches) return;
        clearTimeout(timer);
        closeAll(li);
        if (!li.classList.contains("is-open")) { setOpen(li, true); li.setAttribute("data-hover-open", ""); }
      });
      li.addEventListener("mouseleave", function () {
        if (!canHover.matches) return;
        timer = setTimeout(function () { setOpen(li, false); }, 160);
      });
      trigger.addEventListener("click", function () {
        if (li.hasAttribute("data-hover-open") && trigger.getAttribute("data-href")) {
          window.location.href = trigger.getAttribute("data-href");
          return;
        }
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
      document.documentElement.classList.add("menu-open");
    }
    function close() {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      document.documentElement.style.overflow = "";
      document.documentElement.classList.remove("menu-open");
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

  /* Rood stipje onder de menubalk dat naar het aangewezen menu-item
     springt (speels, naar het voorbeeld van 2manydots). */
  function initNavDot() {
    var ul = document.querySelector(".main-nav > ul");
    if (!ul) return;
    var dot = document.createElement("span");
    dot.className = "nav-dot";
    dot.setAttribute("aria-hidden", "true");
    ul.appendChild(dot);
    var header = document.querySelector(".site-header");
    function moveTo(link) {
      /* Stipje staat t.o.v. de header (die is gepositioneerd), net onder de pil. */
      var a = link.getBoundingClientRect(), h = header.getBoundingClientRect(), u = ul.getBoundingClientRect();
      ul.style.setProperty("--dot-x", Math.round(a.left - h.left + a.width / 2) + "px");
      ul.style.setProperty("--dot-y", Math.round(u.bottom - h.top + 10) + "px");
      ul.classList.add("has-dot");
    }
    ul.querySelectorAll(".nav-link").forEach(function (link) {
      link.addEventListener("mouseenter", function () { moveTo(link); });
      link.addEventListener("focus", function () { moveTo(link); });
    });
    ul.addEventListener("mouseleave", function () {
      setTimeout(function () { if (!ul.querySelector(".nav-item.is-open")) ul.classList.remove("has-dot"); }, 180);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initNavDot();
    initHeaderScrollState();
    initDropdowns();
    initMenuPanel();
  });
})();
