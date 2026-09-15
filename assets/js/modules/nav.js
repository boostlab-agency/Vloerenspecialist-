/* ==========================================================================
   Navigatie-gedrag — mega-menu, overlay-menu, mobiel paneel, zoeken,
   verlanglijst-lade, header-scroll-status.
   Draait op alle pagina's; werkt met de door header.js/footer.js
   geïnjecteerde markup.
   ========================================================================== */
(function () {
  "use strict";
  var DVS = (window.DVS = window.DVS || {});

  var lockCount = 0;
  function lockBody() {
    lockCount++;
    document.documentElement.style.overflow = "hidden";
  }
  function unlockBody() {
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) document.documentElement.style.overflow = "";
  }

  function initHeaderScrollState() {
    var header = document.querySelector(".site-header");
    if (!header) return;
    function onScroll() {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  function initMegaMenu() {
    var items = document.querySelectorAll(".nav-item");
    if (!items.length) return;
    var closeTimer;

    function closeAll() {
      items.forEach(function (li) {
        li.classList.remove("is-open");
        var btn = li.querySelector(".nav-link");
        if (btn && btn.tagName === "BUTTON") btn.setAttribute("aria-expanded", "false");
      });
    }
    function openItem(li) {
      closeAll();
      li.classList.add("is-open");
      var btn = li.querySelector(".nav-link");
      if (btn && btn.tagName === "BUTTON") btn.setAttribute("aria-expanded", "true");
    }

    items.forEach(function (li) {
      var btn = li.querySelector(".nav-link");
      var hasMega = !!li.querySelector(".mega");
      if (!hasMega) return;

      li.addEventListener("mouseenter", function () {
        window.clearTimeout(closeTimer);
        openItem(li);
      });
      li.addEventListener("mouseleave", function () {
        closeTimer = window.setTimeout(closeAll, 120);
      });
      btn.addEventListener("click", function () {
        var isOpen = li.classList.contains("is-open");
        isOpen ? closeAll() : openItem(li);
      });
    });

    document.addEventListener("click", function (e) {
      if (!e.target.closest(".nav-item")) closeAll();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeAll();
    });
  }

  function initOverlayMenu() {
    var toggle = document.getElementById("overlay-toggle");
    var nav = document.getElementById("overlay-nav");
    var closeBtn = document.getElementById("overlay-close");
    if (!toggle || !nav) return;

    function open() {
      nav.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
      lockBody();
    }
    function close() {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      unlockBody();
    }
    toggle.addEventListener("click", function () {
      nav.classList.contains("is-open") ? close() : open();
    });
    if (closeBtn) closeBtn.addEventListener("click", close);
    nav.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", close); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) close();
    });
  }

  function initMobileNav() {
    var toggle = document.getElementById("mobile-nav-toggle");
    var nav = document.getElementById("mobile-nav");
    if (!toggle || !nav) return;

    function open() { nav.classList.add("is-open"); toggle.setAttribute("aria-expanded", "true"); lockBody(); }
    function close() { nav.classList.remove("is-open"); toggle.setAttribute("aria-expanded", "false"); unlockBody(); }
    toggle.addEventListener("click", function () {
      nav.classList.contains("is-open") ? close() : open();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) close();
    });

    nav.querySelectorAll(".acc-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var li = btn.closest("li");
        var isOpen = li.classList.contains("is-open");
        nav.querySelectorAll(".mobile-nav-list > li").forEach(function (other) {
          other.classList.remove("is-open");
          other.querySelector(".acc-btn").setAttribute("aria-expanded", "false");
        });
        if (!isOpen) { li.classList.add("is-open"); btn.setAttribute("aria-expanded", "true"); }
      });
    });
  }

  function initSearch() {
    var toggle = document.getElementById("search-toggle");
    var panel = document.getElementById("search-panel");
    var closeBtn = document.getElementById("search-close");
    var form = document.getElementById("search-form");
    if (!toggle || !panel) return;

    function open() {
      panel.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
      var input = panel.querySelector("input");
      if (input) window.setTimeout(function () { input.focus(); }, 250);
    }
    function close() {
      panel.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    }
    toggle.addEventListener("click", function () {
      panel.classList.contains("is-open") ? close() : open();
    });
    if (closeBtn) closeBtn.addEventListener("click", close);
    if (form) form.addEventListener("submit", function (e) { e.preventDefault(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && panel.classList.contains("is-open")) close();
    });
  }

  function initWishlistDrawer() {
    var toggle = document.getElementById("wishlist-toggle");
    var drawer = document.getElementById("wishlist-drawer");
    var scrim = document.getElementById("wishlist-scrim");
    var closeBtn = document.getElementById("wishlist-close");
    var body = document.getElementById("wishlist-body");
    var countEl = document.getElementById("wishlist-count");
    if (!toggle || !drawer || !DVS.Wishlist) return;

    function renderBody() {
      var items = DVS.Wishlist.getAll();
      if (!items.length) {
        body.innerHTML =
          '<div class="drawer-empty">' +
            '<p>Nog niets bewaard. Blader door onze collecties en bewaar wat je mooi vindt — neem je verlanglijst straks mee naar de showroom.</p>' +
            '<a class="btn-text" href="/vloeren/index.html">Verken de vloeren <span class="arrow">→</span></a>' +
          "</div>";
        return;
      }
      body.innerHTML = items.map(function (item) {
        return (
          '<div class="card" style="padding:14px;margin-bottom:10px;display:flex;gap:12px;align-items:center">' +
            '<div class="ph" style="width:64px;height:64px;border-radius:6px;flex:none"></div>' +
            '<div style="flex:1;min-width:0">' +
              '<div style="font-weight:600;font-size:14.5px">' + item.title + "</div>" +
              (item.subtitle ? '<div style="font-size:13px;color:var(--ink-soft)">' + item.subtitle + "</div>" : "") +
            "</div>" +
            '<button class="icon-btn" data-remove="' + item.id + '" aria-label="Verwijder">✕</button>' +
          "</div>"
        );
      }).join("");
      body.querySelectorAll("[data-remove]").forEach(function (btn) {
        btn.addEventListener("click", function () { DVS.Wishlist.remove(btn.getAttribute("data-remove")); });
      });
    }

    function renderCount() {
      var n = DVS.Wishlist.count();
      if (countEl) {
        countEl.textContent = String(n);
        countEl.hidden = n === 0;
      }
    }

    function open() { drawer.classList.add("is-open"); scrim.classList.add("is-open"); lockBody(); renderBody(); }
    function close() { drawer.classList.remove("is-open"); scrim.classList.remove("is-open"); unlockBody(); }

    toggle.addEventListener("click", open);
    if (closeBtn) closeBtn.addEventListener("click", close);
    if (scrim) scrim.addEventListener("click", close);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && drawer.classList.contains("is-open")) close();
    });

    DVS.Wishlist.onChange(function () { renderCount(); if (drawer.classList.contains("is-open")) renderBody(); });
    renderCount();
  }

  document.addEventListener("DOMContentLoaded", function () {
    initHeaderScrollState();
    initMegaMenu();
    initOverlayMenu();
    initMobileNav();
    initSearch();
    initWishlistDrawer();
  });
})();
