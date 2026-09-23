/* ==========================================================================
   Zoeken + categoriefilter voor kaartoverzichten, puur client-side.
   Gebruikt op /merken/index.html; alleen actief als .journal-toolbar bestaat.
   ========================================================================== */
(function () {
  "use strict";
  var toolbar = document.querySelector(".journal-toolbar");
  if (!toolbar) return;

  var searchInput = document.getElementById("journal-search");
  var cats = document.querySelectorAll(".journal-cat");
  var cards = document.querySelectorAll(".article-card");
  var empty = document.querySelector(".journal-empty");
  var activeCat = "alle";

  function apply() {
    var q = (searchInput && searchInput.value || "").trim().toLowerCase();
    var visible = 0;
    cards.forEach(function (card) {
      var cat = card.getAttribute("data-cat");
      var text = card.getAttribute("data-search") || "";
      var matchesCat = activeCat === "alle" || cat === activeCat;
      var matchesQuery = !q || text.indexOf(q) !== -1;
      var show = matchesCat && matchesQuery;
      card.style.display = show ? "" : "none";
      if (show) visible++;
    });
    if (empty) empty.classList.toggle("is-visible", visible === 0);
  }

  cats.forEach(function (btn) {
    btn.addEventListener("click", function () {
      cats.forEach(function (b) { b.classList.remove("is-active"); });
      btn.classList.add("is-active");
      activeCat = btn.getAttribute("data-cat");
      apply();
    });
  });

  if (searchInput) {
    searchInput.addEventListener("input", apply);
  }
})();
