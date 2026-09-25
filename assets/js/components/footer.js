/* ==========================================================================
   Footer-component + herbruikbare showroom-CTA-band.
   De band wordt automatisch getoond op elke pagina behalve de homepage,
   die al met een eigen uitnodigingshoofdstuk eindigt.
   ========================================================================== */
(function () {
  "use strict";
  window.DVS = window.DVS || {};

  function bandTemplate() {
    return (
      '<div class="showroom-cta-band" data-review-id="showroom-band" data-review-label="Showroom-CTA-band">' +
        '<div class="wrap">' +
          "<div>" +
            "<h3>Twijfel je nog? Kom het voelen.</h3>" +
            "<p>1.800 m² complete woonopstellingen, vrijblijvend en persoonlijk advies.</p>" +
          "</div>" +
          '<a class="btn btn-primary" href="/showroom.html">Plan showroombezoek</a>' +
        "</div>" +
      "</div>"
    );
  }

  function footerTemplate() {
    return (
      '<footer class="site-footer" data-review-id="footer" data-review-label="Footer">' +
        '<div class="wrap">' +
          '<div class="footer-top">' +
            '<div class="footer-brand">' +
              '<a class="brand" href="/index.html"><img class="brand-logo" src="/assets/img/logo.svg" alt="De Vloerenspecialist" width="230" height="34"></a>' +
              "<p>Het interieurmerk van Tilburg, met de showroom als hart. Vier disciplines, één team, één standaard.</p>" +
              '<div class="footer-social">' +
                '<a href="https://www.instagram.com/vloerenspecialisttilburg/" target="_blank" rel="noopener" aria-label="Instagram">' +
                  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>' +
                "</a>" +
                '<a href="https://www.facebook.com/p/Vloerenspecialist-Tilburg-61574414801570/" target="_blank" rel="noopener" aria-label="Facebook">' +
                  '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.87.25-1.46 1.5-1.46h1.55V4.46A20.6 20.6 0 0 0 14.3 4.3c-2.23 0-3.76 1.36-3.76 3.86v2.34H8v3h2.54V21h2.96z"/></svg>' +
                "</a>" +
              "</div>" +
            "</div>" +
            '<div class="footer-col">' +
              "<h4>Vloeren</h4>" +
              "<ul>" +
                '<li><a href="/vloeren/pvc.html">PVC vloeren</a></li>' +
                '<li><a href="/vloeren/hout.html">Houten vloeren</a></li>' +
                '<li><a href="/vloeren/laminaat.html">Laminaat</a></li>' +
                '<li><a href="/vloeren/tegelvloer.html">Tegelvloer</a></li>' +
                '<li><a href="/vloeren/vloerbedekking.html">Vloerbedekking</a></li>' +
                '<li><a href="/vloeren/gietvloer.html">Gietvloer</a></li>' +
                '<li><a href="/vloeren/hybride-houtenvloer.html">Hybride houtenvloer</a></li>' +
                '<li><a href="/merken/index.html">Alle merken</a></li>' +
              "</ul>" +
            "</div>" +
            '<div class="footer-col">' +
              "<h4>Assortiment</h4>" +
              "<ul>" +
                '<li><a href="/interieur/index.html">Interieur op maat</a></li>' +
                '<li><a href="/interieur/behang.html">Behang</a></li>' +
                '<li><a href="/interieur/raamdecoratie.html">Raamdecoratie</a></li>' +
                '<li><a href="/showroom.html">Showroom</a></li>' +
                '<li><a href="/inspiratie/projecten.html">Projecten</a></li>' +
                '<li><a href="/over-ons/index.html">Over ons</a></li>' +
              "</ul>" +
            "</div>" +
            '<div class="footer-col footer-showroom">' +
              "<h4>Showroom</h4>" +
              '<div class="info">' +
                "<span><strong>Adres</strong>Jules Verneweg 7a, 5015 BD Tilburg</span>" +
                "<span><strong>Openingstijden</strong>Ma–vr 09:00–17:00 · Za 09:00–15:00 · Zo gesloten</span>" +
                '<span><strong>Telefoon</strong><a href="tel:+31135368598">013 - 536 85 98</a></span>' +
              "</div>" +
              '<a class="btn btn-outline btn-sm" href="/showroom.html">Plan showroombezoek</a>' +
            "</div>" +
          "</div>" +
          '<div class="footer-bottom">' +
            "<span>© " + new Date().getFullYear() + " De Vloerenspecialist, Tilburg</span>" +
            '<div class="legal">' +
              '<a href="/contact.html">Contact</a>' +
              '<a href="/privacy.html">Privacy</a>' +
              '<a href="/voorwaarden.html">Voorwaarden</a>' +
            "</div>" +
          "</div>" +
        "</div>" +
      "</footer>"
    );
  }

  function mount() {
    var target = document.getElementById("site-footer");
    if (!target) return;
    var isHome = document.body.getAttribute("data-page") === "home";
    target.innerHTML = (isHome ? "" : bandTemplate()) + footerTemplate();
  }

  mount();
})();
