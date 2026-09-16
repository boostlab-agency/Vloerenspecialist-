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
                '<a href="#" aria-label="Instagram">IG</a>' +
                '<a href="#" aria-label="Pinterest">PI</a>' +
                '<a href="#" aria-label="LinkedIn">LI</a>' +
              "</div>" +
            "</div>" +
            '<div class="footer-col">' +
              "<h4>Vloeren</h4>" +
              "<ul>" +
                '<li><a href="/vloeren/pvc.html">PVC vloeren</a></li>' +
                '<li><a href="/vloeren/hout.html">Houten vloeren</a></li>' +
                '<li><a href="/vloeren/laminaat.html">Laminaat</a></li>' +
                '<li><a href="/vloeren/visgraat.html">Visgraat</a></li>' +
                '<li><a href="/vloeren/tapijt.html">Tapijt</a></li>' +
                '<li><a href="/merken/index.html">Alle merken</a></li>' +
              "</ul>" +
            "</div>" +
            '<div class="footer-col">' +
              "<h4>Merk</h4>" +
              "<ul>" +
                '<li><a href="/interieur/index.html">Interieur</a></li>' +
                '<li><a href="/inspiratie/projecten.html">Inspiratie</a></li>' +
                '<li><a href="/journal/index.html">Journal</a></li>' +
                '<li><a href="/over-ons/index.html">Over ons</a></li>' +
                '<li><a href="/over-ons/werkwijze.html">Werkwijze</a></li>' +
                '<li><a href="/over-ons/team.html">Team</a></li>' +
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
