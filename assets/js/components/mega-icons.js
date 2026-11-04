/* ==========================================================================
   Lijnillustraties voor het megamenu — één per onderdeel. Eenvoudige
   tekeningen in warm zwart met één rood accent (huisstijlrood), zodat het
   menu speels oogt maar bij de rustige stijl van de site blijft.
   Elk icoon: viewBox 0 0 64 64; lijnen via currentColor, accent via .r.
   ========================================================================== */
(function () {
  "use strict";
  window.DVS = window.DVS || {};

  function svg(body) {
    return '<svg class="mega-ico" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + "</svg>";
  }
  var R = 'class="r"'; // rood accent

  DVS.megaIcons = {
    /* ---- Vloeren ---- */
    "pvc": svg(
      '<path d="M8 44l20-10 28 10-20 10z"/><path d="M8 44v4l28 10v-4"/><path d="M56 44v4l-20 10"/>' +
      '<path d="M15 41l28 10M22 37l28 10" opacity=".45"/>' +
      '<path ' + R + ' d="M44 10c4 5 6 8.5 6 11a6 6 0 0 1-12 0c0-2.5 2-6 6-11z"/>'
    ),
    "hout": svg(
      '<path d="M6 46l26-14 26 14-26 14z"/><path d="M13 42.3l26 14M19.5 38.8l26 14M26 35.3l26 14"/>' +
      '<path d="M30 14c-6 0-10 3-10 7s4 7 10 7 10-3 10-7"/><path d="M26 21c0-1.7 1.8-3 4-3"/>' +
      '<circle ' + R + ' cx="30" cy="21" r="1.6" fill="currentColor"/>'
    ),
    "laminaat": svg(
      '<rect x="8" y="18" width="30" height="9"/><rect x="26" y="27" width="30" height="9"/><rect x="8" y="36" width="30" height="9"/>' +
      '<path d="M38 18h18v9M8 27h18M38 45h18v-9"/>' +
      '<path ' + R + ' d="M44 50l4 4 8-8"/>'
    ),
    "tegel": svg(
      '<path d="M4 46l28-14 28 14-28 14z"/><path d="M18 39l28 14M46 39L18 53"/>' +
      '<path ' + R + ' d="M32 32l14 7-14 7-14-7z" fill="currentColor" fill-opacity=".14"/>' +
      '<path d="M24 12h16v12H24z"/><path d="M32 12v12M24 18h16"/>'
    ),
    "vloerbedekking": svg(
      '<ellipse cx="16" cy="26" rx="8" ry="10"/><ellipse cx="16" cy="26" rx="3" ry="4"/>' +
      '<path d="M16 16h34v20H16"/><path d="M16 36l-4 20h44l-6-20"/>' +
      '<path ' + R + ' d="M22 46h4M30 46h4M38 46h4M46 46h2"/>'
    ),
    "giet": svg(
      '<path d="M14 12h22l-3 16H17z"/><path d="M36 15c5 0 7 3 5 7"/>' +
      '<path ' + R + ' d="M25 28c0 6-1 10 3 14"/>' +
      '<path d="M6 50c8-4 16-4 22-2s14 2 30-2"/><path d="M6 56c10-3 18-3 26-1s16 1 26-1" opacity=".45"/>'
    ),
    "hybride": svg(
      '<path d="M8 40l20-10 28 10-20 10z"/><path d="M8 40v6l28 10v-6M56 40v6l-20 10"/>' +
      '<path d="M18 36l28 10" opacity=".45"/>' +
      '<path d="M40 8c-8 2-12 8-10 16 8-1 13-7 10-16z"/><path d="M30 24c2-5 5-9 9-12"/>' +
      '<path ' + R + ' d="M50 16c3 4 4.5 6.5 4.5 8.5a4.5 4.5 0 0 1-9 0c0-2 1.5-4.5 4.5-8.5z"/>'
    ),
    "vloeren-alle": svg(
      '<rect x="8" y="8" width="20" height="20"/><rect x="36" y="8" width="20" height="20"/><rect x="8" y="36" width="20" height="20"/>' +
      '<rect ' + R + ' x="36" y="36" width="20" height="20"/>'
    ),

    /* ---- Interieur op maat ---- */
    "kasten": svg(
      '<rect x="10" y="8" width="44" height="48"/><path d="M32 8v48M10 50h44"/>' +
      '<path d="M28 28v6M36 28v6"/>' +
      '<path ' + R + ' d="M16 16h10M16 16v2M26 16v2M21 13v3"/><path d="M38 16h10v24H38z" opacity=".45"/>'
    ),
    "deuren": svg(
      '<rect x="16" y="6" width="32" height="52"/><path d="M32 6v52M16 23h32M16 40h32"/>' +
      '<path ' + R + ' d="M22 12l6 6M38 29l6 6"/><circle cx="35" cy="33" r=".5" fill="currentColor"/>'
    ),
    "meubels": svg(
      '<rect x="6" y="32" width="52" height="16"/><path d="M32 32v16M12 48v6M52 48v6"/>' +
      '<rect x="14" y="8" width="36" height="20"/><path d="M28 28l-2 4M36 28l2 4"/>' +
      '<path ' + R + ' d="M26 40h2M36 40h2"/>'
    ),

    /* ---- Behang ---- */
    "fotobehang": svg(
      '<rect x="6" y="10" width="52" height="40"/><path d="M6 42l14-14 10 10 8-8 20 20"/>' +
      '<circle ' + R + ' cx="44" cy="22" r="5"/><path d="M6 56h52" opacity=".45"/>'
    ),
    "papierbehang": svg(
      '<path d="M14 10h34v40H14z"/><ellipse cx="14" cy="30" rx="5" ry="20"/>' +
      '<path d="M48 50l6 6H20" /><path d="M24 18l6 6-6 6 6 6-6 6M36 18l6 6-6 6 6 6-6 6" opacity=".5"/>' +
      '<path ' + R + ' d="M30 24l6 6-6 6"/>'
    ),
    "vinylbehang": svg(
      '<path d="M12 10h30v40H12z"/><ellipse cx="12" cy="30" rx="5" ry="20"/>' +
      '<path d="M20 20h14M20 28h14M20 36h14" opacity=".5"/>' +
      '<path ' + R + ' d="M50 30c4 5 6 8 6 10.5a6 6 0 0 1-12 0C44 38 46 35 50 30z"/>'
    ),
    "vliesbehang": svg(
      '<rect x="8" y="8" width="24" height="48"/><path d="M8 20h24M8 32h24M8 44h24" opacity=".45"/>' +
      '<rect x="40" y="10" width="16" height="12" rx="2"/><path d="M48 22v8l-6 4v20"/>' +
      '<path ' + R + ' d="M40 16h-4"/>'
    ),
    "renostuc": svg(
      '<path d="M6 10h40v44H6z"/><path ' + R + ' d="M14 18l6 8-4 6 6 8"/>' +
      '<path d="M38 36l18-6v8l-18 6z"/><path d="M47 33l-6-10"/>'
    ),

    /* ---- Raamdecoratie ---- */
    "jaloezieen": svg(
      '<rect x="10" y="6" width="44" height="52"/><path d="M10 14h44M10 21h44M10 28h44M10 35h44M10 42h44M10 49h44"/>' +
      '<path ' + R + ' d="M50 6v34"/><circle ' + R + ' cx="50" cy="42" r="2"/>'
    ),
    "rol": svg(
      '<rect x="10" y="12" width="44" height="46"/><rect x="6" y="6" width="52" height="6" rx="3"/>' +
      '<path d="M12 12v24h40V12"/><path d="M12 36h40"/>' +
      '<path ' + R + ' d="M32 36v6"/><circle ' + R + ' cx="32" cy="44" r="2"/><path d="M32 46v12" opacity=".35"/>'
    ),
    "plisse": svg(
      '<rect x="10" y="6" width="44" height="52"/>' +
      '<path d="M12 10l40 4-40 4 40 4-40 4 40 4-40 4"/><path d="M12 38h40"/>' +
      '<path ' + R + ' d="M12 10h40"/>'
    ),
    "vouw": svg(
      '<rect x="10" y="6" width="44" height="52"/>' +
      '<path d="M12 8h40v14c-6 4-34 4-40 0z"/><path d="M12 22c6 6 34 6 40 0v8c-6 5-34 5-40 0z"/>' +
      '<path ' + R + ' d="M54 10v30"/>'
    ),
    "alle": svg(
      '<circle cx="32" cy="32" r="22"/><path ' + R + ' d="M22 32h20M34 24l8 8-8 8"/>'
    )
  };

  /* Welk icoon bij welke link. */
  DVS.megaIconFor = function (href) {
    var map = [
      ["/vloeren/pvc", "pvc"], ["/vloeren/hout", "hout"], ["/vloeren/laminaat", "laminaat"],
      ["/vloeren/tegel", "tegel"], ["/vloeren/vloerbedekking", "vloerbedekking"], ["/vloeren/giet", "giet"],
      ["/vloeren/hybride", "hybride"], ["kasten-op-maat", "kasten"], ["deuren-en-wanden", "deuren"], ["meubels-op-maat", "meubels"],
      ["#fotobehang", "fotobehang"], ["#papierbehang", "papierbehang"], ["#vinylbehang", "vinylbehang"],
      ["#vliesbehang", "vliesbehang"], ["#renostuc", "renostuc"], ["#jaloezieen", "jaloezieen"],
      ["#rolgordijnen", "rol"], ["#plissegordijnen", "plisse"], ["#vouwgordijnen", "vouw"],
      ["/vloeren/index", "vloeren-alle"]
    ];
    for (var i = 0; i < map.length; i++) if (href.indexOf(map[i][0]) !== -1) return DVS.megaIcons[map[i][1]];
    return DVS.megaIcons.alle;
  };
})();
