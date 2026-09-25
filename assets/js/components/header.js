/* ==========================================================================
   Header-component — één ontwerp, overal identiek (homepage én subpagina's):
   logo, zoekicoon, CTA en een menuknop die een premium split-panel
   navigatie-ervaring opent (categorieën links, bijbehorende content rechts,
   glas + blur), in plaats van een eenvoudige lijst of klassieke dropdowns.
   Wordt synchroon geïnjecteerd (script met defer, dus DOM al geparsed).
   ========================================================================== */
(function () {
  "use strict";
  window.DVS = window.DVS || {};

  var ICONS = {
    search: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
    close: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    arrow: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
  };

  function img(src, w) {
    if (src.indexOf("images.unsplash.com") !== -1) return src + "?fm=jpg&q=72&auto=format&fit=crop&w=" + w;
    return src;
  }

  /* Eén datamodel voor het volledige-schermmenu: "rich" categorieën tonen
     een lijst met sublinks (evt. met thumbnail) plus een uitgelicht beeld;
     "simple" categorieën (Showroom, Over ons, Contact) tonen één groot
     beeld met een korte pitch en CTA — zo oogt elk paneel altijd gevuld,
     nooit als een lege dropdown. */
  /* Indeling volgt het assortiment van de bestaande website: vier
     categorieën (Vloeren, Interieur op maat, Behang, Raamdecoratie).
     Vloeren heeft per type een eigen pagina; bij de andere drie verwijzen
     de sublinks naar een sectie op één overzichtspagina. */
  var PANELS = [
    {
      key: "vloeren", label: "Vloeren", href: "/vloeren/index.html", type: "rich",
      media: { src: img("https://images.unsplash.com/photo-1584622781564-1d987f7333c1", 900), label: "Alle vloeren bekijken", href: "/vloeren/index.html" },
      groups: [
        {
          title: "Vloertypes",
          links: [
            { label: "PVC vloeren", href: "/vloeren/pvc.html", img: img("https://images.unsplash.com/photo-1716315325541-776e39f9725f", 160) },
            { label: "Houten vloeren", href: "/vloeren/hout.html", img: img("https://images.unsplash.com/photo-1772797583328-f83bc3f94f80", 160) },
            { label: "Laminaat", href: "/vloeren/laminaat.html", img: img("https://images.unsplash.com/photo-1560184897-1ee3713708ee", 160) },
            { label: "Tegelvloer", href: "/vloeren/tegelvloer.html", img: img("https://images.unsplash.com/photo-1708540084677-dc5838b37627", 160) },
            { label: "Vloerbedekking", href: "/vloeren/vloerbedekking.html", img: img("https://images.unsplash.com/photo-1770941633927-b7a15557e0e1", 160) },
            { label: "Gietvloer", href: "/vloeren/gietvloer.html", img: img("https://images.unsplash.com/photo-1765728614529-4749706523d9", 160) },
            { label: "Hybride houtenvloer", href: "/vloeren/hybride-houtenvloer.html", img: img("https://images.unsplash.com/photo-1783125126583-9aba58ccb0ef", 160) }
          ]
        },
        {
          title: "Merken",
          links: [
            { label: "Floer", href: "/merken/floer.html" },
            { label: "Belakos", href: "/merken/belakos.html" },
            { label: "Moduleo", href: "/merken/moduleo.html" },
            { label: "COREtec", href: "/merken/coretec.html" },
            { label: "Alle merken", href: "/merken/index.html", more: true }
          ]
        }
      ]
    },
    {
      key: "interieur", label: "Interieur op maat", href: "/interieur/index.html", type: "rich",
      media: { src: img("https://images.unsplash.com/photo-1717429541792-5c59021d6ceb", 900), label: "Interieur op maat bekijken", href: "/interieur/index.html" },
      groups: [
        {
          title: "Keuze uit interieur op maat",
          links: [
            { label: "Kasten op maat", href: "/interieur/index.html#kasten", img: "/assets/img/real/kasten-garderobe-900.jpg" },
            { label: "Deuren en wanden op maat", href: "/interieur/index.html#deuren-wanden", img: img("https://images.unsplash.com/photo-1721742151032-e0c159fe5097", 160) },
            { label: "Meubels op maat", href: "/interieur/index.html#meubels", img: img("https://images.unsplash.com/photo-1781032392300-ed3bdf78ef4c", 160) }
          ]
        }
      ]
    },
    {
      key: "behang", label: "Behang", href: "/interieur/behang.html", type: "rich",
      media: { src: "/assets/img/real/behang-woonkamer-900.jpg", label: "Alle behang bekijken", href: "/interieur/behang.html" },
      groups: [
        {
          title: "Keuze uit behang",
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
      key: "raamdecoratie", label: "Raamdecoratie", href: "/interieur/raamdecoratie.html", type: "rich",
      media: { src: "/assets/img/real/gordijn-linnen-blauw-tapijt-900.jpg", label: "Alle raamdecoratie bekijken", href: "/interieur/raamdecoratie.html" },
      groups: [
        {
          title: "Keuze uit raamdecoratie",
          links: [
            { label: "Jaloezieën", href: "/interieur/raamdecoratie.html#jaloezieen", img: img("https://images.unsplash.com/photo-1609534117141-ff9f20450902", 160) },
            { label: "Rolgordijnen", href: "/interieur/raamdecoratie.html#rolgordijnen", img: img("https://images.unsplash.com/photo-1776261293170-66fd3b09273e", 160) },
            { label: "Plisségordijnen", href: "/interieur/raamdecoratie.html#plissegordijnen", img: img("https://images.unsplash.com/photo-1596275617740-a2ea3bf3aca9", 160) },
            { label: "Vouwgordijnen", href: "/interieur/raamdecoratie.html#vouwgordijnen", img: img("https://images.unsplash.com/photo-1779078652928-6d941878d32e", 160) }
          ]
        },
        {
          title: "Merken",
          links: [
            { label: "KeJe", href: "/merken/keje.html" },
            { label: "Lifestyle gordijnen", href: "/merken/lifestyle-gordijnen.html" },
            { label: "Mart Visser", href: "/merken/mart-visser.html" },
            { label: "Eijffinger", href: "/merken/eijffinger.html" }
          ]
        }
      ]
    },
    {
      key: "showroom", label: "Showroom", href: "/showroom.html", type: "simple",
      media: { src: "/assets/img/real/showroom-gevel-1800.jpg", label: "" },
      pitch: "1.800 m² complete woonopstellingen, 62+ merken en persoonlijk advies zonder verkooppraatjes.",
      cta: { label: "Plan showroombezoek", href: "/showroom.html" }
    },
    {
      key: "over-ons", label: "Over ons", href: "/over-ons/index.html", type: "simple",
      media: { src: "/assets/img/real/gordijn-wit-sculptuur-1800.jpg", label: "" },
      pitch: "Nog steeds een vloerenzaak in hart en nieren — inmiddels ook uw adres voor interieur op maat, behang en raamdecoratie.",
      cta: { label: "Ons verhaal", href: "/over-ons/index.html" },
      ctaSecondary: { label: "Bekijk projecten", href: "/inspiratie/projecten.html" }
    },
    {
      key: "contact", label: "Contact", href: "/contact.html", type: "simple",
      media: { src: "/assets/img/real/gordijn-linnen-stoel-1800.jpg", label: "" },
      pitch: "Jules Verneweg 7a, 5015 BD Tilburg — Ma–vr 09:00–17:00, za 09:00–15:00.",
      cta: { label: "013 - 536 85 98", href: "tel:+31135368598" },
      ctaSecondary: { label: "Stuur een bericht", href: "/contact.html" }
    }
  ];

  function renderCats() {
    return PANELS.map(function (p, i) {
      /* Echte link naar de overzichtspagina: hover (muis) toont het paneel,
         klikken opent de pagina. Op touch opent de eerste tik het paneel,
         een tweede tik de pagina (zie nav.js). */
      return (
        '<a class="overlay-cat' + (i === 0 ? " is-active" : "") + '" href="' + p.href + '" data-cat="' + p.key + '">' +
          '<span class="oc-no">' + String(i + 1).padStart(2, "0") + "</span>" +
          '<span class="oc-label">' + p.label + "</span>" +
        "</a>"
      );
    }).join("");
  }

  function renderGroupLinks(links) {
    return links.map(function (l) {
      return (
        '<a href="' + l.href + '" class="op-link' + (l.more ? " is-more" : "") + '">' +
          (l.img ? '<span class="op-thumb"><img src="' + l.img + '" alt="" loading="lazy"></span>' : "") +
          '<span class="op-link-label">' + l.label + (l.more ? " " + ICONS.arrow : "") + "</span>" +
        "</a>"
      );
    }).join("");
  }

  function renderRichPanel(p) {
    var groups = p.groups.map(function (g) {
      return (
        '<div class="op-group">' +
          '<p class="op-group-title">' + g.title + "</p>" +
          '<div class="op-list">' + renderGroupLinks(g.links) + "</div>" +
        "</div>"
      );
    }).join("");
    return (
      '<div class="op-groups' + (p.groups.length > 1 ? " is-split" : "") + '">' + groups + "</div>" +
      '<a class="op-media" href="' + p.media.href + '">' +
        '<img src="' + p.media.src + '" alt="" loading="lazy">' +
        '<span class="op-media-cap">' + p.media.label + " " + ICONS.arrow + "</span>" +
      "</a>"
    );
  }

  function renderSimplePanel(p) {
    return (
      '<a class="op-hero" href="' + p.cta.href + '">' +
        '<img src="' + p.media.src + '" alt="" loading="lazy">' +
      "</a>" +
      '<div class="op-hero-copy">' +
        "<p>" + p.pitch + "</p>" +
        '<div class="op-hero-actions">' +
          '<a class="btn btn-primary magnetic" href="' + p.cta.href + '">' + p.cta.label + "</a>" +
          (p.ctaSecondary ? '<a class="btn-text magnetic" href="' + p.ctaSecondary.href + '">' + p.ctaSecondary.label + " " + ICONS.arrow + "</a>" : "") +
        "</div>" +
      "</div>"
    );
  }

  function renderPanels() {
    return PANELS.map(function (p, i) {
      return (
        '<div class="overlay-panel' + (i === 0 ? " is-active" : "") + '" data-panel="' + p.key + '" role="tabpanel">' +
          (p.type === "rich" ? renderRichPanel(p) : renderSimplePanel(p)) +
        "</div>"
      );
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
        '<div class="overlay-backdrop" id="overlay-backdrop"></div>' +
        '<div class="overlay-shell">' +
          '<button class="overlay-close" id="overlay-close" aria-label="Sluit menu">' + ICONS.close + "</button>" +
          '<div class="overlay-body">' +
            '<div class="overlay-cats" id="overlay-cats" aria-label="Categorieën">' + renderCats() + "</div>" +
            '<div class="overlay-panels" id="overlay-panels">' + renderPanels() + "</div>" +
          "</div>" +
          '<div class="overlay-foot">' +
            "<span>Jules Verneweg 7a, 5015 BD Tilburg</span>" +
            "<span>Ma–vr 09:00–17:00 · Za 09:00–15:00 · Zo gesloten</span>" +
            '<a href="tel:+31135368598">013 - 536 85 98</a>' +
          "</div>" +
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

  DVS.header = {
    isHome: document.body.getAttribute("data-page") === "home",
    setProgress: function (pct) {
      var el = document.getElementById("scroll-progress");
      if (el) el.textContent = String(Math.round(pct)).padStart(2, "0") + "%";
    }
  };
})();
