/* ==========================================================================
   Header-component — twee modi (immersief / vast), mega-menu, overlay-menu,
   mobiel navigatiepaneel, zoeken, verlanglijst-trigger.
   Wordt synchroon geïnjecteerd (script met defer, dus DOM al geparsed).
   ========================================================================== */
(function () {
  "use strict";
  window.DVS = window.DVS || {};

  var ICONS = {
    search: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
    heart: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21s-7.5-4.6-10-9.3C.5 8 2 4.5 5.6 4c2-.3 3.7.7 4.9 2.3.2.3.7.3.9 0C12.7 4.7 14.4 3.7 16.4 4 20 4.5 21.5 8 20 11.7 17.5 16.4 12 21 12 21z"/></svg>',
    bars: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    close: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  };

  var NAV = [
    {
      label: "Vloeren", href: "/vloeren/index.html", key: "vloeren",
      mega: {
        cols: [
          {
            title: "Op type",
            links: [
              { label: "PVC vloeren", href: "/vloeren/pvc.html" },
              { label: "Houten vloeren", href: "/vloeren/hout.html" },
              { label: "Laminaat", href: "/vloeren/laminaat.html" },
              { label: "Visgraat", href: "/vloeren/visgraat.html" },
              { label: "Tapijt", href: "/vloeren/tapijt.html" }
            ]
          },
          {
            title: "Ontdek",
            links: [
              { label: "Alle merken", href: "/merken/index.html", note: "62+ gerenommeerde namen" },
              { label: "Vloeren in echte ruimtes", href: "/inspiratie/projecten.html", note: "Inspiratie per ruimte" },
              { label: "Legpatronen en kleuren", href: "/inspiratie/projecten.html", note: "Van visgraat tot chevron" }
            ]
          }
        ],
        promo: { k: "In de showroom", text: "1.800 m² complete woonopstellingen — leg collecties naast elkaar en voel het verschil.", href: "/showroom.html", cta: "Plan showroombezoek" }
      }
    },
    {
      label: "Interieur", href: "/interieur/index.html", key: "interieur",
      mega: {
        cols: [
          {
            title: "Disciplines",
            links: [
              { label: "Kasten op maat", href: "/interieur/kasten-op-maat.html", note: "Kasten, garderobes, stalen deuren" },
              { label: "Behang", href: "/interieur/behang.html", note: "Karakter voor je wand" },
              { label: "Raamdecoratie", href: "/interieur/raamdecoratie.html", note: "Gordijnen, shutters, zonwering" },
              { label: "Renostuc", href: "/interieur/renostuc.html", note: "Naadloze wandafwerking" }
            ]
          },
          {
            title: "Ontdek",
            links: [
              { label: "Projecten", href: "/inspiratie/projecten.html" },
              { label: "Journal", href: "/journal/index.html" }
            ]
          }
        ],
        promo: { k: "Eén adres", text: "Eigen vakmensen in dienst voor je hele interieur, van ontwerp tot oplevering.", href: "/over-ons/werkwijze.html", cta: "Bekijk de werkwijze" }
      }
    },
    { label: "Merken", href: "/merken/index.html", key: "merken" },
    { label: "Inspiratie", href: "/inspiratie/projecten.html", key: "inspiratie" },
    { label: "Showroom", href: "/showroom.html", key: "showroom" },
    { label: "Over ons", href: "/over-ons/index.html", key: "over-ons" }
  ];

  function normalize(p) {
    if (!p) return "/index.html";
    if (p.endsWith("/")) p += "index.html";
    return p;
  }
  function currentPath() { return normalize(window.location.pathname); }
  function isActive(href) {
    var cur = currentPath();
    return cur === normalize(href) || (href !== "/index.html" && cur.indexOf(normalize(href).replace("index.html", "")) === 0);
  }

  function renderMegaCol(col) {
    var links = col.links.map(function (l) {
      return '<a href="' + l.href + '">' + l.label + (l.note ? '<span>' + l.note + "</span>" : "") + "</a>";
    }).join("");
    return '<div><p class="mega-col-title">' + col.title + '</p><div class="mega-list">' + links + "</div></div>";
  }
  function renderMega(item) {
    if (!item.mega) return "";
    var cols = item.mega.cols.map(renderMegaCol).join("");
    var promo = item.mega.promo;
    var promoHtml = promo ? (
      '<div class="mega-promo"><span class="k">' + promo.k + "</span><p>" + promo.text + '</p><a class="btn-text" href="' + promo.href + '">' + promo.cta + ' <span class="arrow">→</span></a></div>'
    ) : "";
    return '<div class="mega" role="menu">' + cols + promoHtml + "</div>";
  }

  function renderDesktopNav() {
    return NAV.map(function (item) {
      var active = isActive(item.href) ? ' aria-current="page"' : "";
      if (item.mega) {
        return (
          '<li class="nav-item" data-nav-key="' + item.key + '">' +
            '<button class="nav-link" aria-expanded="false" aria-haspopup="true"' + active + '>' + item.label + ' <span class="chev">▾</span></button>' +
            renderMega(item) +
          "</li>"
        );
      }
      return '<li class="nav-item"><a class="nav-link" href="' + item.href + '"' + active + ">" + item.label + "</a></li>";
    }).join("");
  }

  function renderMobileNav() {
    return NAV.map(function (item, i) {
      if (item.mega) {
        var allLinks = item.mega.cols.reduce(function (acc, c) { return acc.concat(c.links); }, []);
        var links = allLinks.map(function (l) { return '<a href="' + l.href + '">' + l.label + "</a>"; }).join("");
        return (
          '<li data-acc="' + i + '">' +
            '<button class="acc-btn" aria-expanded="false">' + item.label + ' <span class="chev">▾</span></button>' +
            '<div class="acc-panel">' + links + '<a href="' + item.href + '"><strong>Bekijk alles</strong></a></div>' +
          "</li>"
        );
      }
      return '<li><a href="' + item.href + '">' + item.label + "</a></li>";
    }).join("");
  }

  function renderOverlayNav() {
    var items = [{ label: "Home", href: "/index.html" }].concat(
      NAV.map(function (n) { return { label: n.label, href: n.href }; })
    ).concat([{ label: "Contact", href: "/contact.html" }]);
    return items.map(function (item, i) {
      var no = String(i).padStart(2, "0");
      return '<li><a href="' + item.href + '"><span class="no">' + no + "</span>" + item.label + "</a></li>";
    }).join("");
  }

  /**
   * Beide modi delen dezelfde markup; welke elementen zichtbaar zijn wordt
   * volledig door CSS bepaald via [data-mode]. Zo kan de homepage tijdens
   * het scrollen live wisselen van modus A naar modus B zonder opnieuw
   * te renderen — alleen het data-mode-attribuut verandert.
   * Op interne pagina's (altijd modus B) laten we de modus-A-only
   * elementen (overlay-menu, scroll-voortgang) achterwege.
   */
  function headerTemplate(isHome) {
    var mode = isHome ? "a" : "b";
    return (
      '<header class="site-header" data-mode="' + mode + '" data-review-id="header" data-review-label="Header">' +
        '<div class="wrap">' +
          '<a class="brand" href="/index.html"><img class="brand-logo" src="/assets/img/logo.svg" alt="De Vloerenspecialist" width="230" height="34"></a>' +

          '<nav aria-label="Hoofdnavigatie">' +
            '<ul class="main-nav">' + renderDesktopNav() + "</ul>" +
          "</nav>" +

          '<div class="header-utility">' +
            (isHome ? '<span class="header-progress" id="scroll-progress" aria-hidden="true">00%</span>' : "") +
            '<button class="icon-btn search-only-desktop" id="search-toggle" aria-expanded="false" aria-label="Zoeken">' + ICONS.search + "</button>" +
            '<button class="icon-btn" id="wishlist-toggle" aria-label="Verlanglijst">' + ICONS.heart + '<span class="count" id="wishlist-count" hidden>0</span></button>' +
            '<a class="btn btn-sm" href="/showroom.html" id="header-cta"><span class="cta-full">Plan showroombezoek</span><span class="cta-short">Bezoek plannen</span></a>' +
            (isHome ? '<button class="overlay-toggle" id="overlay-toggle" aria-expanded="false" aria-controls="overlay-nav"><span class="bars"><span></span><span></span><span></span></span><span class="ov-label">Menu</span></button>' : "") +
            '<button class="menu-btn" id="mobile-nav-toggle" aria-expanded="false" aria-controls="mobile-nav" aria-label="Menu">' + ICONS.bars + "</button>" +
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

      (isHome
        ? '<nav class="overlay-nav" id="overlay-nav" aria-label="Volledige navigatie">' +
            '<button class="overlay-close" id="overlay-close" aria-label="Sluit menu">' + ICONS.close + "</button>" +
            '<div class="wrap">' +
              '<ul class="overlay-list">' + renderOverlayNav() + "</ul>" +
              '<div class="overlay-foot">' +
                "<span>Jules Verneweg 7a, 5015 BD Tilburg</span>" +
                "<span>Ma–vr 09:00–17:00 · Za 09:00–15:00 · Zo gesloten</span>" +
                '<a href="tel:+31135368598">013 - 536 85 98</a>' +
              "</div>" +
            "</div>" +
          "</nav>"
        : ""
      ) +

      '<nav class="mobile-nav" id="mobile-nav" aria-label="Mobiele navigatie">' +
        '<div class="wrap">' +
          '<ul class="mobile-nav-list">' + renderMobileNav() + "</ul>" +
          '<div class="mobile-nav-foot">' +
            '<a class="btn btn-primary" href="/showroom.html">Plan showroombezoek</a>' +
            '<a class="btn btn-outline" href="tel:+31135368598">Bel de showroom</a>' +
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
    var isHome = document.body.getAttribute("data-page") === "home";
    target.innerHTML = headerTemplate(isHome);
  }

  mount();

  DVS.header = {
    isHome: document.body.getAttribute("data-page") === "home",
    setMode: function (mode) {
      var el = document.querySelector(".site-header");
      if (el) el.setAttribute("data-mode", mode);
    },
    setProgress: function (pct) {
      var el = document.getElementById("scroll-progress");
      if (el) el.textContent = String(Math.round(pct)).padStart(2, "0") + "%";
    }
  };
})();
