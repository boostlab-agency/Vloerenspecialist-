/* ==========================================================================
   Afsprakenpagina (/afspraak.html)
   - Zet de eerstvolgende 14 openingsdagen als dagknoppen neer (zondag dicht).
   - Past de middagtijd aan op zaterdag (tot 15.00 uur).
   - Houdt de "bezoekkaart" rechts bij: onderwerp en moment.
   Versturen gebeurt in page.js (initAanvraagForm → /api/aanvraag).
   ========================================================================== */
(function () {
  "use strict";
  var form = document.getElementById("appt-form");
  var wrap = form && form.querySelector("[data-days]");
  if (!form || !wrap) return;

  var DAGEN = ["zo", "ma", "di", "wo", "do", "vr", "za"];
  var DAGEN_LANG = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
  var MAANDEN = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
  var MAANDEN_LANG = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
  function iso(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }

  var html = "", d = new Date(), n = 0;
  d.setHours(12, 0, 0, 0);
  while (n < 14) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 0) continue;
    html += '<label class="ap-day' + (d.getDay() === 6 ? " is-sat" : "") + '">' +
      '<input type="radio" name="datum" value="' + iso(d) + '"' + (n === 0 ? " required" : "") +
      ' data-label="' + DAGEN_LANG[d.getDay()] + " " + d.getDate() + " " + MAANDEN_LANG[d.getMonth()] + '" data-sat="' + (d.getDay() === 6 ? 1 : 0) + '">' +
      "<span><small>" + DAGEN[d.getDay()] + "</small><b>" + d.getDate() + "</b><small>" + MAANDEN[d.getMonth()] + "</small></span></label>";
    n++;
  }
  wrap.innerHTML = html;

  var middag = form.querySelector("[data-middag]");
  var sumOnd = document.querySelector('[data-sum="onderwerp"]');
  var sumWan = document.querySelector('[data-sum="wanneer"]');

  function update() {
    var ond = Array.prototype.map.call(form.querySelectorAll('input[name="onderwerp"]:checked'), function (c) { return c.value; });
    if (sumOnd) sumOnd.textContent = ond.length ? ond.join(", ") : "Nog niets gekozen";
    var day = form.querySelector('input[name="datum"]:checked');
    var part = form.querySelector('input[name="dagdeel"]:checked');
    var sat = day && day.getAttribute("data-sat") === "1";
    if (middag) middag.textContent = sat ? "12 – 15 uur" : "12 – 17 uur";
    if (sumWan) {
      var txt = day ? day.getAttribute("data-label") : "Kies een dag";
      if (day && part) txt += ", " + (part.value === "ochtend" ? "ochtend (9 – 12 uur)" : (sat ? "middag (12 – 15 uur)" : "middag (12 – 17 uur)"));
      sumWan.textContent = txt;
      sumWan.classList.toggle("is-set", !!day);
    }
    if (sumOnd) sumOnd.classList.toggle("is-set", ond.length > 0);
  }
  form.addEventListener("change", update);
  // page.js kan een onderwerp vooraf aanvinken; daarna één keer bijwerken.
  window.setTimeout(update, 0);
  document.addEventListener("DOMContentLoaded", update);
})();
