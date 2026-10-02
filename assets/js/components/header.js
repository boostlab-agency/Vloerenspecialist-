/* ==========================================================================
   Header-component — één licht, overzichtelijk ontwerp op elke pagina.
   Computer: logo, altijd zichtbare hoofdnavigatie met eenvoudige
   uitklapmenu's (Vloeren, Interieur op maat, Behang, Raamdecoratie),
   telefoonnummer en de knop "Plan showroombezoek".
   Kleinere schermen: logo + bellen + menuknop; het menu opent als een
   licht paneel met uitklapbare categorieën en snelle acties.
   Wordt synchroon geïnjecteerd (script met defer, dus DOM al geparsed).
   ========================================================================== */
(function () {
  "use strict";
  window.DVS = window.DVS || {};

  var ICONS = {
    close: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    caret: '<svg class="nav-caret" width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 8h16l-8 9z"/></svg>',
    phone: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>',
    whatsapp: '<svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91A9.85 9.85 0 0 0 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.23 8.23 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24a8.2 8.2 0 0 1 8.24 8.25c0 4.54-3.7 8.23-8.24 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48a.92.92 0 0 0-.67.31c-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.02 2.57.12.17 1.76 2.68 4.25 3.76.59.26 1.06.41 1.42.52.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.14-1.18-.06-.11-.22-.17-.47-.29z"/></svg>',
    pin: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>'
  };

  function img(src, w) {
    if (src.indexOf("images.unsplash.com") !== -1) return src + "?fm=jpg&q=72&auto=format&fit=crop&w=" + w;
    return src;
  }

  /* Eén datamodel voor de navigatie (computer én telefoon). Indeling volgt
     het assortiment van de bestaande website: Vloeren (per type een eigen
     pagina), Interieur op maat, Behang en Raamdecoratie (sublinks naar een
     sectie op één overzichtspagina), plus Showroom, Over ons en Contact. */
  var NAV = [
    {
      key: "vloeren", label: "Vloeren", href: "/vloeren/index.html", all: "Alle vloeren",
      groups: [
        {
          title: "Vloertypes",
          links: [
            { label: "PVC vloeren", href: "/vloeren/pvc.html", img: img("https://images.unsplash.com/photo-1716315325541-776e39f9725f", 160) },
            { label: "Houten vloeren", href: "/vloeren/hout.html", img: img("https://images.unsplash.com/photo-1772797583328-f83bc3f94f80", 160) },
            { label: "Laminaat", href: "/vloeren/laminaat.html", img: img("https://images.unsplash.com/photo-1560184897-1ee3713708ee", 160) },
            { label: "Tegelvloer", href: "/vloeren/tegelvloer.html", img: img("https://images.unsplash.com/photo-1708540084677-dc5838b37627", 160) },
            { label: "Vloerbedekking", href: "/vloeren/vloerbedekking.html", img: img("https://images.unsplash.com/photo-1772563214602-3c6434766700", 160) },
            { label: "Gietvloer", href: "/vloeren/gietvloer.html", img: img("https://images.unsplash.com/photo-1765728614529-4749706523d9", 160) },
            { label: "Hybride houtenvloer", href: "/vloeren/hybride-houtenvloer.html", img: img("https://images.unsplash.com/photo-1783125126583-9aba58ccb0ef", 160) }
          ]
        }
      ]
    },
    {
      key: "interieur", label: "Interieur op maat", href: "/interieur/index.html", all: "Alles over interieur op maat",
      groups: [
        {
          title: "Interieur op maat",
          links: [
            { label: "Kasten op maat", href: "/interieur/index.html#kasten", img: "/assets/img/real/kasten-garderobe-900.jpg" },
            { label: "Deuren en wanden op maat", href: "/interieur/index.html#deuren-wanden", img: img("https://images.unsplash.com/photo-1721742151032-e0c159fe5097", 160) },
            { label: "Meubels op maat", href: "/interieur/index.html#meubels", img: "/assets/img/real/meubels-op-maat-900.jpg" }
          ]
        }
      ]
    },
    {
      key: "behang", label: "Behang", href: "/interieur/behang.html", all: "Alles over behang",
      groups: [
        {
          title: "Soorten behang",
          links: [
            { label: "Fotobehang", href: "/interieur/behang.html#fotobehang", img: img("https://images.unsplash.com/photo-1759774313806-7c564f3bd592", 160) },
            { label: "Papierbehang", href: "/interieur/behang.html#papierbehang", img: img("https://images.unsplash.com/photo-1783403716758-27e30a7976ca", 160) },
            { label: "Vinylbehang", href: "/interieur/behang.html#vinylbehang", img: "/assets/img/real/behang-woonkamer-900.jpg" },
            { label: "Vliesbehang", href: "/interieur/behang.html#vliesbehang", img: img("https://images.unsplash.com/photo-1695624794480-7449b7e5a0b4", 160) },
            { label: "Renostuc", href: "/interieur/behang.html#renostuc", img: "/assets/img/real/renostuc-bedroom-sage-1600.jpg" }
          ]
        }
      ]
    },
    {
      key: "raamdecoratie", label: "Raamdecoratie", href: "/interieur/raamdecoratie.html", all: "Alles over raamdecoratie",
      groups: [
        {
          title: "Soorten raamdecoratie",
          links: [
            { label: "Jaloezieën", href: "/interieur/raamdecoratie.html#jaloezieen", img: img("https://images.unsplash.com/photo-1609534117141-ff9f20450902", 160) },
            { label: "Rolgordijnen", href: "/interieur/raamdecoratie.html#rolgordijnen", img: img("https://images.unsplash.com/photo-1776261293170-66fd3b09273e", 160) },
            { label: "Plisségordijnen", href: "/interieur/raamdecoratie.html#plissegordijnen", img: img("https://images.unsplash.com/photo-1596275617740-a2ea3bf3aca9", 160) },
            { label: "Vouwgordijnen", href: "/interieur/raamdecoratie.html#vouwgordijnen", img: img("https://images.unsplash.com/photo-1779078652928-6d941878d32e", 160) }
          ]
        }
      ]
    },
    { key: "showroom", label: "Showroom", href: "/showroom.html" },
    { key: "over-ons", label: "Over ons", href: "/over-ons/index.html" },
    { key: "contact", label: "Contact", href: "/contact.html" }
  ];

  var here = window.location.pathname;
  function isCurrent(item) {
    if (here === item.href) return true;
    if (item.key === "vloeren") return here.indexOf("/vloeren/") === 0 || here.indexOf("/merken/") === 0;
    return false;
  }

  /* ---- Computer: hoofdnavigatie met uitklapmenu's ---- */
  function renderDesktopNav() {
    return NAV.map(function (item) {
      var cls = "nav-item" + (item.groups ? " has-drop" : "") + (isCurrent(item) ? " is-current" : "");
      if (!item.groups) {
        return '<li class="' + cls + '"><a class="nav-link" href="' + item.href + '">' + item.label + "</a></li>";
      }
      /* Eenvoudige tekstlijst over de volle breedte onder de header, in
         kolommen van maximaal vier regels. Geen foto's, geen merken. */
      var links = [];
      item.groups.forEach(function (g) { links = links.concat(g.links); });
      var list = links.map(function (l) {
        return '<a class="drop-link" href="' + l.href + '">' + l.label + "</a>";
      }).join("");
      var id = "drop-" + item.key;
      return (
        '<li class="' + cls + '">' +
          '<button class="nav-link nav-trigger" type="button" aria-expanded="false" aria-controls="' + id + '">' + item.label + ICONS.caret + "</button>" +
          '<div class="nav-drop" id="' + id + '">' +
            '<div class="drop-list">' + list + "</div>" +
          "</div>" +
        "</li>"
      );
    }).join("");
  }

  /* ---- Telefoon/tablet: menupaneel in dezelfde stijl als op de computer ----
     Eén kolom met rustige rijen; categorieën klappen open (één tegelijk) met
     hetzelfde driehoekje als op de computer en tonen een eenvoudige
     tekstlijst — geen foto's, geen merken. Showroom/Over ons/Contact linken
     direct. Onderaan: plannen, bellen, WhatsApp, route. */
  function renderMobileNav() {
    var cats = NAV.map(function (item) {
      var current = isCurrent(item);
      if (!item.groups) {
        return '<a class="m-cat m-cat-link' + (current ? " is-current" : "") + '" href="' + item.href + '"><span>' + item.label + "</span></a>";
      }
      var links = [];
      item.groups.forEach(function (g) { links = links.concat(g.links); });
      var list = links.map(function (l) {
        return '<a class="m-sub-link" href="' + l.href + '">' + l.label + "</a>";
      }).join("");
      return (
        '<details class="m-cat m-cat-acc' + (current ? " is-current" : "") + '">' +
          "<summary><span>" + item.label + "</span>" + ICONS.caret + "</summary>" +
          '<div class="m-sub">' + list + "</div>" +
        "</details>"
      );
    }).join("");

    return (
      '<div class="m-nav">' +
        '<div class="m-cats">' + cats + "</div>" +
        '<div class="m-actions">' +
          '<a class="btn btn-primary m-plan" href="/showroom.html">Plan showroombezoek</a>' +
          '<div class="m-quick">' +
            '<a href="tel:+31135368598">' + ICONS.phone + "<span>Bellen</span></a>" +
            '<a href="https://wa.me/31135368598" target="_blank" rel="noopener">' + ICONS.whatsapp + "<span>WhatsApp</span></a>" +
            '<a href="https://www.google.com/maps/dir/?api=1&amp;destination=Jules+Verneweg+7a,+5015+BD+Tilburg" target="_blank" rel="noopener">' + ICONS.pin + "<span>Route</span></a>" +
          "</div>" +
          '<span class="m-status" data-open-status></span>' +
          '<p class="m-address">Jules Verneweg 7a, Tilburg<br>Ma–vr 09:00–17:00 · Za 09:00–15:00</p>' +
        "</div>" +
      "</div>"
    );
  }

  function headerTemplate() {
    return (
      '<header class="site-header" data-review-id="header" data-review-label="Header">' +
        '<div class="wrap header-bar">' +
          '<a class="brand" href="/index.html"><img class="brand-logo" src="/assets/img/logo-dark.svg" alt="De Vloerenspecialist Tilburg" width="260" height="38"></a>' +
          '<nav class="main-nav" aria-label="Hoofdmenu"><ul>' + renderDesktopNav() + "</ul></nav>" +
          '<div class="header-actions">' +
            '<a class="header-phone" href="tel:+31135368598" aria-label="Bel 013 - 536 85 98">' + ICONS.phone + '<span class="header-phone-nr">013 - 536 85 98</span></a>' +
            '<a class="btn btn-primary btn-sm header-cta" href="/showroom.html" id="header-cta">Plan showroombezoek</a>' +
            '<button class="menu-toggle" id="overlay-toggle" aria-expanded="false" aria-controls="overlay-nav"><span class="bars" aria-hidden="true"><span></span><span></span><span></span></span><span class="menu-label">Menu</span></button>' +
          "</div>" +
        "</div>" +
      "</header>" +

      '<nav class="overlay-nav" id="overlay-nav" aria-label="Menu">' +
        '<div class="overlay-backdrop" id="overlay-backdrop"></div>' +
        '<div class="overlay-shell">' +
          '<div class="overlay-top">' +
            '<a class="brand" href="/index.html"><img class="brand-logo" src="/assets/img/logo-dark.svg" alt="De Vloerenspecialist Tilburg" width="260" height="38"></a>' +
            '<button class="overlay-close" id="overlay-close" aria-label="Sluit menu">' + ICONS.close + "</button>" +
          "</div>" +
          renderMobileNav() +
        "</div>" +
      "</nav>"
    );
  }

  function mount() {
    var target = document.getElementById("site-header");
    if (!target) return;
    target.innerHTML = headerTemplate();
  }

  mount();

  /* Feedbacktool overal beschikbaar: elke pagina laadt deze header, dus
     hier zorgen we dat ook de feedbackmodus (en de Supabase-client waar die
     op leunt) geladen wordt — ook op toekomstige pagina's waar de losse
     <script>-tags vergeten zijn. Staan ze er al, dan gebeurt er niets. */
  function ensureFeedbackTool() {
    if (document.querySelector('script[src*="feedback-mode.js"]')) return;
    if (!document.querySelector('link[href*="feedback-mode.css"]')) {
      var css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = "/assets/css/feedback-mode.css";
      document.head.appendChild(css);
    }
    function loadScript(src, onload) {
      var s = document.createElement("script");
      s.src = src;
      if (onload) s.onload = onload;
      document.head.appendChild(s);
    }
    function loadFeedback() { loadScript("/assets/js/modules/feedback-mode.js"); }
    if (typeof window.supabase !== "undefined") loadFeedback();
    else loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js", loadFeedback);
  }
  ensureFeedbackTool();

  /* De live openingsstatus in het menu heeft open-status.js nodig; laad die
     mee op pagina's die hem nog niet zelf laden. */
  if (!document.querySelector('script[src*="open-status.js"]')) {
    var os = document.createElement("script");
    os.src = "/assets/js/modules/open-status.js";
    document.head.appendChild(os);
  }

  DVS.header = { isHome: document.body.getAttribute("data-page") === "home" };
})();
