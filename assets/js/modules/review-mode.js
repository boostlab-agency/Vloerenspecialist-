/* ==========================================================================
   Reviewmodus — verborgen feedbacklaag voor klantfeedback per sectie.
   Activeren via ?review=true ergens op de site.

   Werking:
   - Elke belangrijke sectie draagt data-review-id + data-review-label.
   - In reviewmodus opent een klik op zo'n sectie (buiten links/knoppen om)
     een formulier: bericht + status (Open / In behandeling / Afgerond).
   - Feedback wordt opgeslagen in localStorage (key "dvsReviewFeedback"),
     als platte JSON-array — eenvoudig later te vervangen door een backend.
   - Een werkbalk linksonder toont het aantal openstaande items en opent
     een overzichtspaneel waarin de status per item aangepast kan worden.
   ========================================================================== */
(function () {
  "use strict";
  var DVS = (window.DVS = window.DVS || {});
  var STORAGE_KEY = "dvsReviewFeedback";
  var STATUS = [
    { value: "open", label: "Open" },
    { value: "in-behandeling", label: "In behandeling" },
    { value: "afgerond", label: "Afgerond" }
  ];

  var params = new URLSearchParams(window.location.search);
  var isActive = params.get("review") === "true";
  if (!isActive) return;

  document.documentElement.classList.add("review-mode");

  /* ---------------- Opslag ---------------- */
  function readAll() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }
  function writeAll(items) {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch (e) {}
  }
  function addEntry(entry) {
    var items = readAll();
    items.unshift(entry);
    writeAll(items);
    refreshAll();
  }
  function updateStatus(id, status) {
    var items = readAll().map(function (i) {
      if (i.id === id) { i.status = status; i.updatedAt = new Date().toISOString(); }
      return i;
    });
    writeAll(items);
    refreshAll();
  }
  function removeEntry(id) {
    writeAll(readAll().filter(function (i) { return i.id !== id; }));
    refreshAll();
  }
  function uid() {
    return "rv-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  /* ---------------- Sectie-badges (aantal items per sectie) ---------------- */
  function refreshSectionBadges() {
    var items = readAll();
    var here = items.filter(function (i) { return i.path === window.location.pathname; });
    document.querySelectorAll("[data-review-id]").forEach(function (el) {
      var id = el.getAttribute("data-review-id");
      var n = here.filter(function (i) { return i.sectionId === id; }).length;
      el.setAttribute("data-review-count", String(n));
    });
  }

  /* ---------------- Werkbalk ---------------- */
  var toolbar = document.createElement("div");
  toolbar.className = "rv-toolbar";
  toolbar.innerHTML =
    '<span class="rv-dot" aria-hidden="true"></span>' +
    '<span class="rv-label">Reviewmodus actief</span>' +
    '<button type="button" id="rv-open-panel">Feedback <span class="rv-count" id="rv-total-count">0</span></button>';
  document.body.appendChild(toolbar);

  function refreshToolbar() {
    var total = readAll().length;
    var el = document.getElementById("rv-total-count");
    if (el) el.textContent = String(total);
  }

  /* ---------------- Feedbackformulier (per sectie) ---------------- */
  var formScrim = document.createElement("div");
  formScrim.className = "rv-scrim";
  formScrim.innerHTML =
    '<div class="rv-modal" role="dialog" aria-modal="true" aria-labelledby="rv-form-title">' +
      '<h3 id="rv-form-title">Feedback achterlaten</h3>' +
      '<p class="rv-target">Sectie: <strong id="rv-form-section">—</strong></p>' +
      '<div class="rv-field">' +
        '<label for="rv-form-message">Je opmerking</label>' +
        '<textarea id="rv-form-message" placeholder="Wat valt je op aan dit onderdeel?"></textarea>' +
      "</div>" +
      '<div class="rv-field">' +
        "<label>Status</label>" +
        '<div class="rv-status-group" id="rv-form-status">' +
          STATUS.map(function (s, i) {
            return (
              '<label><input type="radio" name="rv-status" value="' + s.value + '"' + (i === 0 ? " checked" : "") + ">" +
              '<span class="pill"><span class="sw"></span>' + s.label + "</span></label>"
            );
          }).join("") +
        "</div>" +
      "</div>" +
      '<div class="rv-actions">' +
        '<button type="button" class="btn-ghost" id="rv-form-cancel">Annuleren</button>' +
        '<button type="button" class="btn-save" id="rv-form-save">Feedback opslaan</button>' +
      "</div>" +
    "</div>";
  document.body.appendChild(formScrim);

  var activeSection = null;
  function openForm(sectionEl) {
    activeSection = sectionEl;
    document.getElementById("rv-form-section").textContent = sectionEl.getAttribute("data-review-label") || sectionEl.getAttribute("data-review-id");
    document.getElementById("rv-form-message").value = "";
    formScrim.querySelectorAll('input[name="rv-status"]').forEach(function (r, i) { r.checked = i === 0; });
    formScrim.classList.add("is-open");
    window.setTimeout(function () { document.getElementById("rv-form-message").focus(); }, 150);
  }
  function closeForm() { formScrim.classList.remove("is-open"); activeSection = null; }

  document.getElementById("rv-form-cancel").addEventListener("click", closeForm);
  formScrim.addEventListener("click", function (e) { if (e.target === formScrim) closeForm(); });
  document.getElementById("rv-form-save").addEventListener("click", function () {
    if (!activeSection) return;
    var message = document.getElementById("rv-form-message").value.trim();
    if (!message) { document.getElementById("rv-form-message").focus(); return; }
    var status = formScrim.querySelector('input[name="rv-status"]:checked').value;
    addEntry({
      id: uid(),
      path: window.location.pathname,
      pageTitle: document.title,
      sectionId: activeSection.getAttribute("data-review-id"),
      sectionLabel: activeSection.getAttribute("data-review-label") || activeSection.getAttribute("data-review-id"),
      message: message,
      status: status,
      createdAt: new Date().toISOString()
    });
    closeForm();
  });

  /* ---------------- Overzichtspaneel ---------------- */
  var panelScrim = document.createElement("div");
  panelScrim.className = "rv-scrim";
  panelScrim.innerHTML =
    '<div class="rv-modal rv-panel-modal" role="dialog" aria-modal="true" aria-labelledby="rv-panel-title">' +
      '<div class="rv-panel-head">' +
        '<h3 id="rv-panel-title">Feedback op deze site</h3>' +
        '<button type="button" class="rv-close" id="rv-panel-close" aria-label="Sluiten">✕</button>' +
      "</div>" +
      "<p>Opgeslagen in de browser van dit apparaat, gegroepeerd per pagina en sectie.</p>" +
      '<div class="rv-filter-row" id="rv-filter-row">' +
        '<button type="button" data-filter="all" class="is-active">Alles</button>' +
        STATUS.map(function (s) { return '<button type="button" data-filter="' + s.value + '">' + s.label + "</button>"; }).join("") +
      "</div>" +
      '<div class="rv-list" id="rv-list"></div>' +
    "</div>";
  document.body.appendChild(panelScrim);

  var currentFilter = "all";
  function statusLabel(v) { var s = STATUS.filter(function (x) { return x.value === v; })[0]; return s ? s.label : v; }
  function fmtDate(iso) {
    try {
      var d = new Date(iso);
      return d.toLocaleDateString("nl-NL", { day: "2-digit", month: "short" }) + " · " + d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
    } catch (e) { return ""; }
  }

  function renderList() {
    var items = readAll();
    if (currentFilter !== "all") items = items.filter(function (i) { return i.status === currentFilter; });
    var list = document.getElementById("rv-list");
    if (!items.length) {
      list.innerHTML = '<div class="rv-empty">Nog geen feedback' + (currentFilter !== "all" ? " met deze status" : "") + ".</div>";
      return;
    }
    list.innerHTML = items.map(function (i) {
      return (
        '<div class="rv-item" data-id="' + i.id + '">' +
          '<div class="rv-item-top">' +
            '<div class="rv-item-meta"><strong>' + i.sectionLabel + "</strong> · " + i.path + "<br>" + fmtDate(i.createdAt) + "</div>" +
            '<span class="rv-badge" data-status="' + i.status + '">' + statusLabel(i.status) + "</span>" +
          "</div>" +
          '<p class="rv-item-msg">' + i.message.replace(/</g, "&lt;") + "</p>" +
          '<div class="rv-item-foot">' +
            '<select data-id="' + i.id + '" aria-label="Status wijzigen">' +
              STATUS.map(function (s) { return '<option value="' + s.value + '"' + (s.value === i.status ? " selected" : "") + ">" + s.label + "</option>"; }).join("") +
            "</select>" +
            '<button type="button" class="rv-item-del" data-id="' + i.id + '">Verwijderen</button>' +
          "</div>" +
        "</div>"
      );
    }).join("");

    list.querySelectorAll("select[data-id]").forEach(function (sel) {
      sel.addEventListener("change", function () { updateStatus(sel.getAttribute("data-id"), sel.value); });
    });
    list.querySelectorAll(".rv-item-del").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (window.confirm("Deze feedback verwijderen?")) removeEntry(btn.getAttribute("data-id"));
      });
    });
  }

  panelScrim.querySelectorAll("#rv-filter-row button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      panelScrim.querySelectorAll("#rv-filter-row button").forEach(function (b) { b.classList.remove("is-active"); });
      btn.classList.add("is-active");
      currentFilter = btn.getAttribute("data-filter");
      renderList();
    });
  });
  function openPanel() { renderList(); panelScrim.classList.add("is-open"); }
  function closePanel() { panelScrim.classList.remove("is-open"); }
  document.getElementById("rv-panel-close").addEventListener("click", closePanel);
  panelScrim.addEventListener("click", function (e) { if (e.target === panelScrim) closePanel(); });
  document.getElementById("rv-open-panel").addEventListener("click", openPanel);

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (formScrim.classList.contains("is-open")) closeForm();
    if (panelScrim.classList.contains("is-open")) closePanel();
  });

  /* ---------------- Klik op sectie ---------------- */
  var INTERACTIVE = "a,button,input,textarea,select,label,[role='button'],[contenteditable]";
  document.addEventListener("click", function (e) {
    if (e.target.closest(".rv-toolbar, .rv-scrim")) return;
    if (e.target.closest(INTERACTIVE)) return;
    var section = e.target.closest("[data-review-id]");
    if (!section) return;
    openForm(section);
  });

  function refreshAll() {
    refreshToolbar();
    refreshSectionBadges();
  }
  refreshAll();
})();
