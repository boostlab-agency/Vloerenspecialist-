/* ==========================================================================
   Live openingsstatus — toont of de showroom nú open is, hoe lang nog, of
   wanneer hij weer opengaat. Werkt op de lokale klok van de bezoeker (de
   showroom zit in Tilburg, dus geen tijdzonegedoe) en ververst zichzelf
   elke 30 seconden.

   Gebruik (op elke pagina):
     <span data-open-status></span>   → pil "Nu geopend · nog 2 u 14 min"
     <div data-open-week></div>        → weekschema met "Vandaag" + dagbalk
   ========================================================================== */
(function () {
  "use strict";

  var DAYS = ["Zondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag"];
  // [openUur, sluitUur] per dag (0 = zondag); null = gesloten.
  var SCHEDULE = { 0: null, 1: [9, 17], 2: [9, 17], 3: [9, 17], 4: [9, 17], 5: [9, 17], 6: [9, 15] };

  function hh(h) { return (h < 10 ? "0" : "") + h + ":00"; }
  function duration(mins) {
    var h = Math.floor(mins / 60), m = mins % 60;
    if (h && m) return h + " u " + m + " min";
    if (h) return h + " uur";
    return m + " min";
  }

  function status(now) {
    var day = now.getDay(), mins = now.getHours() * 60 + now.getMinutes();
    var today = SCHEDULE[day];
    if (today && mins >= today[0] * 60 && mins < today[1] * 60) {
      return { open: true, title: "Nu geopend", sub: "nog " + duration(today[1] * 60 - mins) + " · sluit om " + hh(today[1]) };
    }
    for (var i = 0; i <= 7; i++) {
      var d = (day + i) % 7, hours = SCHEDULE[d];
      if (!hours) continue;
      if (i === 0 && mins >= hours[0] * 60) continue; // vandaag al voorbij
      var when = i === 0 ? "vandaag om " + hh(hours[0])
        : i === 1 ? "morgen om " + hh(hours[0])
        : DAYS[d].toLowerCase() + " om " + hh(hours[0]);
      return { open: false, title: "Nu gesloten", sub: "opent " + when };
    }
    return { open: false, title: "Nu gesloten", sub: "" };
  }

  function renderPill(el, s) {
    el.className = "open-pill" + (s.open ? " is-open" : "");
    el.setAttribute("role", "status");
    el.innerHTML = '<span class="open-dot" aria-hidden="true"></span><strong>' + s.title + "</strong>" +
      (s.sub ? '<span class="open-sub">' + s.sub + "</span>" : "");
  }

  function renderWeek(el, now) {
    var today = now.getDay(), mins = now.getHours() * 60 + now.getMinutes();
    var order = [1, 2, 3, 4, 5, 6, 0]; // week begint op maandag
    el.className = "open-week";
    el.innerHTML = order.map(function (d) {
      var h = SCHEDULE[d], isToday = d === today;
      var bar = "";
      if (isToday && h) {
        var pct = Math.max(0, Math.min(100, (mins - h[0] * 60) / ((h[1] - h[0]) * 60) * 100));
        bar = '<span class="open-today-bar" aria-hidden="true"><span style="width:' + pct.toFixed(1) + '%"></span></span>';
      }
      var openNow = isToday && h && mins >= h[0] * 60 && mins < h[1] * 60;
      return '<div class="open-week-row' + (isToday ? " is-today" : "") + (isToday && !openNow ? " is-closed-now" : "") + '">' +
        '<span class="d">' + DAYS[d] + "</span>" +
        '<span class="t">' + (h ? hh(h[0]) + " – " + hh(h[1]) : "Gesloten") + "</span>" + bar +
      "</div>";
    }).join("");
  }

  function update() {
    var now = new Date(), s = status(now);
    document.querySelectorAll("[data-open-status]").forEach(function (el) { renderPill(el, s); });
    document.querySelectorAll("[data-open-week]").forEach(function (el) { renderWeek(el, now); });
  }

  update();
  window.setInterval(update, 30000);
})();
