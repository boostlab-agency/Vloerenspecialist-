/* ==========================================================================
   Header-component — één ontwerp, overal identiek (homepage én subpagina's):
   logo, twee utility-iconen, CTA en een enkele menuknop die het volledige
   scherm openslaat. Geen los mega-menu of los mobiel paneel meer — één
   navigatiepatroon op elk formaat, zoals Apple's "boven de content zwevende"
   navigatie.
   Wordt synchroon geïnjecteerd (script met defer, dus DOM al geparsed).
   ========================================================================== */
(function () {
  "use strict";
  window.DVS = window.DVS || {};

  var ICONS = {
    search: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
    heart: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21s-7.5-4.6-10-9.3C.5 8 2 4.5 5.6 4c2-.3 3.7.7 4.9 2.3.2.3.7.3.9 0C12.7 4.7 14.4 3.7 16.4 4 20 4.5 21.5 8 20 11.7 17.5 16.4 12 21 12 21z"/></svg>',
    close: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  };

  /* Platte lijst — geen mega-menu meer, dus geen sub-kolommen. Elke rubriek
     heeft een eigen overzichtspagina die op zijn beurt weer naar de
     subpagina's doorlinkt (Vloeren → PVC/hout/laminaat/…, Interieur →
     kasten/behang/raamdecoratie/Renostuc). */
  var NAV = [
    { label: "Vloeren", href: "/vloeren/index.html" },
    { label: "Interieur", href: "/interieur/index.html" },
    { label: "Merken", href: "/merken/index.html" },
    { label: "Journal", href: "/journal/index.html" },
    { label: "Inspiratie", href: "/inspiratie/projecten.html" },
    { label: "Showroom", href: "/showroom.html" },
    { label: "Over ons", href: "/over-ons/index.html" }
  ];

  function renderOverlayNav() {
    var items = [{ label: "Home", href: "/index.html" }].concat(NAV).concat([{ label: "Contact", href: "/contact.html" }]);
    return items.map(function (item, i) {
      var no = String(i).padStart(2, "0");
      return '<li><a href="' + item.href + '"><span class="no">' + no + "</span>" + item.label + "</a></li>";
    }).join("");
  }

  function headerTemplate() {
    return (
      '<header class="site-header" data-review-id="header" data-review-label="Header">' +
        '<div class="wrap">' +
          '<a class="brand" href="/index.html"><img class="brand-logo" src="/assets/img/logo.svg" alt="De Vloerenspecialist" width="260" height="38"></a>' +

          '<div class="header-utility">' +
            '<span class="header-progress" id="scroll-progress" aria-hidden="true">00%</span>' +
            '<button class="icon-btn" id="search-toggle" aria-expanded="false" aria-label="Zoeken">' + ICONS.search + "</button>" +
            '<button class="icon-btn" id="wishlist-toggle" aria-label="Verlanglijst">' + ICONS.heart + '<span class="count" id="wishlist-count" hidden>0</span></button>' +
            '<a class="btn btn-sm" href="/showroom.html" id="header-cta"><span class="cta-full">Plan showroombezoek</span><span class="cta-short">Bezoek plannen</span></a>' +
            '<button class="overlay-toggle" id="overlay-toggle" aria-expanded="false" aria-controls="overlay-nav"><span class="bars"><span></span><span></span><span></span></span><span class="ov-label">Menu</span></button>' +
          "</div>" +
        "</div>" +

        '<div class="search-panel" id="search-panel">' +
          '<div class="wrap">' +
            '<form id="search-form" role="search">' +
              ICONS.search +
              '<input type="search" name="q" placeholder="Zoek op materiaal, merk of kleur…" aria-label="Zoeken">' +
              '<button type="button" class="icon-btn" id="search-close" aria-label="Sluit zoeken">' + ICONS.close + "</button>" +
            "</form>" +
            '<p class="hint">De volledige zoekfunctie volgt zodra de productcatalogus live is.</p>' +
          "</div>" +
        "</div>" +
      "</header>" +

      '<nav class="overlay-nav" id="overlay-nav" aria-label="Volledige navigatie">' +
        '<button class="overlay-close" id="overlay-close" aria-label="Sluit menu">' + ICONS.close + "</button>" +
        '<div class="wrap">' +
          '<ul class="overlay-list">' + renderOverlayNav() + "</ul>" +
          '<div class="overlay-foot">' +
            "<span>Jules Verneweg 7a, 5015 BD Tilburg</span>" +
            "<span>Ma–vr 09:00–17:00 · Za 09:00–15:00 · Zo gesloten</span>" +
            '<a href="tel:+31135368598">013 - 536 85 98</a>' +
          "</div>" +
        "</div>" +
      "</nav>" +

      '<div class="drawer-scrim" id="wishlist-scrim"></div>' +
      '<aside class="drawer" id="wishlist-drawer" aria-label="Verlanglijst">' +
        '<div class="drawer-head"><h3>Verlanglijst</h3><button class="icon-btn" id="wishlist-close" aria-label="Sluit verlanglijst">' + ICONS.close + "</button></div>" +
        '<div class="drawer-body" id="wishlist-body"></div>' +
        '<div class="drawer-foot"><a class="btn btn-outline" style="width:100%" href="/showroom.html">Neem je verlanglijst mee naar de showroom</a></div>' +
      "</aside>"
    );
  }

  function mount() {
    var target = document.getElementById("site-header");
    if (!target) return;
    target.innerHTML = headerTemplate();
  }

  mount();

  DVS.header = {
    isHome: document.body.getAttribute("data-page") === "home",
    setProgress: function (pct) {
      var el = document.getElementById("scroll-progress");
      if (el) el.textContent = String(Math.round(pct)).padStart(2, "0") + "%";
    }
  };
})();
