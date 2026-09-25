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
            { label: "Vloerbedekking", href: "/vloeren/vloerbedekking.html", img: img("https://images.unsplash.com/photo-1772563214602-3c6434766700", 160) },
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
            { label: "Meubels op maat", href: "/interieur/index.html#meubels", img: "/assets/img/real/meubels-op-maat-900.jpg" }
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
      media: { src: img("https://images.unsplash.com/photo-1680503397644-bcd216845f26", 1200), label: "" },
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
      /* Een gezicht i.p.v. een sfeerbeeld: een klik op de adviseur opent de
         contactpagina. */
      media: { src: img("https://images.unsplash.com/photo-1748184201792-8bee75fceb41", 900), label: "Stel uw vraag aan een adviseur", href: "/contact.html", person: true },
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
      '<a class="op-hero' + (p.media.person ? " is-person" : "") + '" href="' + (p.media.href || p.cta.href) + '"' +
        (p.media.label ? ' aria-label="' + p.media.label + '"' : "") + ">" +
        '<img src="' + p.media.src + '" alt="" loading="lazy">' +
        (p.media.label ? '<span class="op-hero-cap">' + p.media.label + " " + ICONS.arrow + "</span>" : "") +
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

  /* ---- Telefoonmenu: eigen, eenvoudiger ontwerp (alleen ≤860px) ----
     Eén kolom met grote, duidelijke rijen. Categorieën met onderdelen
     klappen open (accordeon, één tegelijk); Showroom/Over ons/Contact
     linken direct. Onderaan snelle acties: plannen, bellen, WhatsApp,
     route — de dingen die je op je telefoon het vaakst wilt. */
  var M_ICONS = {
    phone: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>',
    whatsapp: '<svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91A9.85 9.85 0 0 0 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.23 8.23 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24a8.2 8.2 0 0 1 8.24 8.25c0 4.54-3.7 8.23-8.24 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48a.92.92 0 0 0-.67.31c-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.02 2.57.12.17 1.76 2.68 4.25 3.76.59.26 1.06.41 1.42.52.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.14-1.18-.06-.11-.22-.17-.47-.29z"/></svg>',
    pin: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    plus: '<svg class="m-cat-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>'
  };

  function renderMobileNav() {
    var here = window.location.pathname;
    var cats = PANELS.map(function (p) {
      var current = here === p.href || (p.key === "vloeren" && here.indexOf("/vloeren/") === 0);
      if (p.type !== "rich") {
        return '<a class="m-cat m-cat-link' + (current ? " is-current" : "") + '" href="' + p.href + '"><span>' + p.label + "</span>" + ICONS.arrow + "</a>";
      }
      var groups = p.groups.map(function (g) {
        var isBrands = !g.links.some(function (l) { return l.img; });
        var links = g.links.map(function (l) {
          if (isBrands) return '<a class="m-chip' + (l.more ? " is-more" : "") + '" href="' + l.href + '">' + l.label + "</a>";
          return '<a class="m-sub-link" href="' + l.href + '">' +
            (l.img ? '<span class="m-thumb"><img src="' + l.img + '" alt="" loading="lazy"></span>' : "") +
            "<span>" + l.label + "</span></a>";
        }).join("");
        return '<p class="m-group-title">' + g.title + "</p>" +
          '<div class="' + (isBrands ? "m-chips" : "m-sub-list") + '">' + links + "</div>";
      }).join("");
      return (
        '<details class="m-cat m-cat-acc' + (current ? " is-current" : "") + '">' +
          "<summary><span>" + p.label + "</span>" + M_ICONS.plus + "</summary>" +
          '<div class="m-sub">' +
            '<a class="m-all" href="' + p.href + '">Bekijk alles over ' + p.label.toLowerCase() + " " + ICONS.arrow + "</a>" +
            groups +
          "</div>" +
        "</details>"
      );
    }).join("");

    return (
      '<div class="m-nav">' +
        '<span class="m-status" data-open-status></span>' +
        '<div class="m-cats">' + cats + "</div>" +
        '<div class="m-actions">' +
          '<a class="btn btn-primary m-plan" href="/showroom.html">Plan showroombezoek</a>' +
          '<div class="m-quick">' +
            '<a href="tel:+31135368598">' + M_ICONS.phone + "<span>Bellen</span></a>" +
            '<a href="https://wa.me/31135368598" target="_blank" rel="noopener">' + M_ICONS.whatsapp + "<span>WhatsApp</span></a>" +
            '<a href="https://www.google.com/maps/dir/?api=1&amp;destination=Jules+Verneweg+7a,+5015+BD+Tilburg" target="_blank" rel="noopener">' + M_ICONS.pin + "<span>Route</span></a>" +
          "</div>" +
          '<p class="m-address">Jules Verneweg 7a, Tilburg<br>Ma–vr 09:00–17:00 · Za 09:00–15:00</p>' +
        "</div>" +
      "</div>"
    );
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
          renderMobileNav() +
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

  /* De live openingsstatus in het telefoonmenu heeft open-status.js nodig;
     laad die mee op pagina's die hem nog niet zelf laden. */
  if (!document.querySelector('script[src*="open-status.js"]')) {
    var os = document.createElement("script");
    os.src = "/assets/js/modules/open-status.js";
    document.head.appendChild(os);
  }

  DVS.header = {
    isHome: document.body.getAttribute("data-page") === "home",
    setProgress: function (pct) {
      var el = document.getElementById("scroll-progress");
      if (el) el.textContent = String(Math.round(pct)).padStart(2, "0") + "%";
    }
  };
})();
