/* ==========================================================================
   Navigatie-gedrag — volledig-scherm overlaymenu, zoeken, verlanglijst-lade,
   header-scroll-status en -voortgang. Eén header-ontwerp op elke pagina en
   elk formaat, dus geen apart mega-menu of mobiel schuifpaneel meer nodig.
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

  /* Scroll-voortgang in de header — universeel, niet meer homepage-only,
     zodat de header er op elke pagina identiek uitziet en zich identiek
     gedraagt. */
  function initHeaderProgress() {
    if (!DVS.header) return;
    function update() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      DVS.header.setProgress(pct);
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
  }

  function initOverlayMenu() {
    var toggle = document.getElementById("overlay-toggle");
    var nav = document.getElementById("overlay-nav");
    var closeBtn = document.getElementById("overlay-close");
    var backdrop = document.getElementById("overlay-backdrop");
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
    if (backdrop) backdrop.addEventListener("click", close);
    nav.querySelectorAll(".overlay-panels a, .overlay-foot a, .m-nav a").forEach(function (a) { a.addEventListener("click", close); });
    /* Telefoonmenu: accordeon met één open categorie tegelijk. */
    var accs = nav.querySelectorAll(".m-cat-acc");
    accs.forEach(function (d) {
      d.addEventListener("toggle", function () {
        if (!d.open) return;
        accs.forEach(function (other) { if (other !== d) other.open = false; });
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) close();
    });

    /* Categorie ↔ paneel-koppeling: links de rubrieken, rechts de bijbehorende
       content, zoals een split-screen productcatalogus i.p.v. een dropdown.
       Op muis/trackpad schakelt hover al (met een kleine vertraging tegen
       trilling); klik en toetsenbord werken op elk apparaat. Op mobiel/
       touch (zie CSS) valt de rechterkolom weg en wordt elke categorie
       een uitklapbaar paneel — dezelfde data, een compactere vorm. */
    var cats = nav.querySelectorAll(".overlay-cat");
    var panels = nav.querySelectorAll(".overlay-panel");
    var hoverTimer;

    function select(key) {
      cats.forEach(function (btn) {
        btn.classList.toggle("is-active", btn.getAttribute("data-cat") === key);
      });
      panels.forEach(function (panel) {
        panel.classList.toggle("is-active", panel.getAttribute("data-panel") === key);
      });
    }

    /* De categorieën zijn links naar hun overzichtspagina. Met muis toont
       hover het paneel en opent een klik de pagina. Op touch (geen hover)
       toont de eerste tik het paneel en opent een tik op de al actieve
       categorie de pagina. */
    var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    cats.forEach(function (btn) {
      var key = btn.getAttribute("data-cat");
      btn.addEventListener("click", function (e) {
        if (!canHover && !btn.classList.contains("is-active")) {
          e.preventDefault();
          select(key);
          return;
        }
        close();
      });
      if (canHover) {
        btn.addEventListener("mouseenter", function () {
          window.clearTimeout(hoverTimer);
          hoverTimer = window.setTimeout(function () { select(key); }, 60);
        });
      }
      btn.addEventListener("focus", function () { select(key); });
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
    initHeaderProgress();
    initOverlayMenu();
    initSearch();
    initWishlistDrawer();
  });
})();
