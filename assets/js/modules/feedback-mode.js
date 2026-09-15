/* ==========================================================================
   Feedbackmodus — klantvriendelijke, zichtbare reviewlaag ("werk alsof je in
   Figma zit"). Geen verborgen URL-parameter: een knop rechtsboven ("💬
   Feedbackmodus") schakelt de modus voor iedere bezoeker met toegang tot de
   voorstelwebsite in en uit. De voorkeur blijft onthouden (localStorage),
   ook tussen pagina's.

   Werking, per elementtype:
   - Tekst / knop: toont de huidige tekst, laat nieuwe tekst invoeren en past
     die meteen live toe op de pagina (met een subtiele "bewerkt"-markering),
     zodat het voelt als direct redigeren — niet als een support-ticket.
   - Afbeelding: opmerking plaatsen en/of vervanging aanvragen (met badge).
   - Sectie: hoger/lager plaatsen (verplaatst 'm meteen echt), verwijderen
     (dimt 'm met een banner — nooit destructief uit de DOM) of aanpassen
     (vrije opmerking).
   Alles wordt vastgelegd in localStorage (key "dvsFeedback") en getoond in
   een donker feedbackpaneel rechts, met datum, elementtype en status
   (Open / In behandeling / Afgerond).
   ========================================================================== */
(function () {
  "use strict";
  var STORAGE_KEY = "dvsFeedback";
  var ACTIVE_KEY = "dvsFeedbackModeOn";
  var STATUS = [
    { value: "open", label: "Open" },
    { value: "in-behandeling", label: "In behandeling" },
    { value: "afgerond", label: "Afgerond" }
  ];

  var isActive = false;
  try { isActive = window.localStorage.getItem(ACTIVE_KEY) === "1"; } catch (e) {}

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
    return "fb-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }
  function fmtDate(iso) {
    try {
      var d = new Date(iso);
      return d.toLocaleDateString("nl-NL", { day: "2-digit", month: "short", year: "numeric" });
    } catch (e) { return ""; }
  }

  /* ---------------- Tekst lezen/bewerken zonder geneste iconen te breken ----------------
     Bewerkt alleen de eerste niet-lege directe tekstnode van een element, zodat
     een pijltje in "Ontdek Vloeren <span class='arrow'>→</span>" intact blijft. */
  function getEditableText(el) {
    var parts = [];
    el.childNodes.forEach(function (n) { if (n.nodeType === 3) parts.push(n.textContent); });
    var direct = parts.join("").trim();
    return direct || el.textContent.trim();
  }
  function setEditableText(el, newText) {
    var replaced = false;
    Array.prototype.forEach.call(el.childNodes, function (n) {
      if (n.nodeType === 3 && !replaced && n.textContent.trim()) { n.textContent = newText; replaced = true; }
      else if (n.nodeType === 3) { n.textContent = ""; }
    });
    if (!replaced) el.insertBefore(document.createTextNode(newText), el.firstChild);
    el.classList.add("fb-edited");
  }

  /* ---------------- Doel van een klik herkennen ---------------- */
  function describeTarget(el, section) {
    var btn = el.closest("a,button,[role='button']");
    if (btn && section.contains(btn)) {
      return { el: btn, kind: "knop", kindLabel: "Knop", detail: getEditableText(btn).slice(0, 60) };
    }
    var img = el.closest("img");
    if (img && section.contains(img)) {
      return { el: img, kind: "afbeelding", kindLabel: "Afbeelding", detail: img.getAttribute("alt") || "" };
    }
    var textEl = el.closest("h1,h2,h3,h4,h5,p,span,li,blockquote,figcaption");
    if (textEl && section.contains(textEl) && textEl.textContent && textEl.textContent.trim() && !textEl.closest("a,button")) {
      return { el: textEl, kind: "tekst", kindLabel: "Tekst", detail: getEditableText(textEl).slice(0, 60) };
    }
    return { el: section, kind: "sectie", kindLabel: "Sectie", detail: "" };
  }

  /* ---------------- Sectie verplaatsen / markeren ---------------- */
  function moveSection(el, dir) {
    if (dir === "up") {
      var prev = el.previousElementSibling;
      if (prev) { el.parentNode.insertBefore(el, prev); return true; }
    } else {
      var next = el.nextElementSibling;
      if (next) { el.parentNode.insertBefore(next, el); return true; }
    }
    return false;
  }

  /* ================================================================
     UI opbouwen
     ================================================================ */

  /* ---- Schakelknop rechtsboven ---- */
  var toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "fb-toggle";
  toggle.innerHTML = '<span class="fb-toggle-icon">💬</span><span class="fb-toggle-text">Feedbackmodus</span><span class="fb-count" id="fb-toggle-count" hidden>0</span>';
  document.body.appendChild(toggle);

  /* ---- Subtiele overlay over de hele site ---- */
  var overlay = document.createElement("div");
  overlay.className = "fb-overlay";
  document.body.appendChild(overlay);

  /* ---- Zwevende hint bij hover ---- */
  var hint = document.createElement("div");
  hint.className = "fb-hint";
  document.body.appendChild(hint);

  var lastHoverEl = null;
  function clearHover() {
    if (lastHoverEl) lastHoverEl.classList.remove("fb-target-hover");
    lastHoverEl = null;
    hint.classList.remove("is-visible");
  }
  document.addEventListener("mouseover", function (e) {
    if (!isActive) return;
    if (e.target.closest(".fb-toggle, .fb-sidebar, .fb-sidebar-scrim, .fb-scrim")) { clearHover(); return; }
    var section = e.target.closest("[data-review-id]");
    if (!section) { clearHover(); return; }
    var t = describeTarget(e.target, section);
    if (t.el === lastHoverEl) return;
    if (lastHoverEl) lastHoverEl.classList.remove("fb-target-hover");
    lastHoverEl = t.el;
    lastHoverEl.classList.add("fb-target-hover");
    hint.textContent = t.kindLabel;
    hint.classList.add("is-visible");
  });
  document.addEventListener("mousemove", function (e) {
    if (!isActive || !hint.classList.contains("is-visible")) return;
    var x = e.clientX + 16, y = e.clientY + 18;
    if (x + 90 > window.innerWidth) x = window.innerWidth - 90;
    hint.style.left = x + "px";
    hint.style.top = y + "px";
  });
  document.addEventListener("mouseout", function (e) {
    if (!isActive) return;
    if (!e.relatedTarget || !(e.relatedTarget instanceof Element) || !e.relatedTarget.closest("[data-review-id]")) clearHover();
  });

  /* ---- Popover: per elementtype andere inhoud ---- */
  var scrim = document.createElement("div");
  scrim.className = "fb-scrim";
  scrim.innerHTML = '<div class="fb-modal" role="dialog" aria-modal="true"><p class="fb-form-kind" id="fb-form-kind">Sectie</p><div id="fb-form-body"></div></div>';
  document.body.appendChild(scrim);
  var formBody = document.getElementById("fb-form-body");

  var activeTarget = null;
  function baseEntry(target, extra) {
    var label = target.section.getAttribute("data-review-label") || target.section.getAttribute("data-review-id");
    var entry = {
      id: uid(),
      path: window.location.pathname,
      pageTitle: document.title,
      sectionId: target.section.getAttribute("data-review-id"),
      sectionLabel: label,
      targetKind: target.kind,
      targetKindLabel: target.kindLabel,
      targetDetail: target.detail,
      status: "open",
      createdAt: new Date().toISOString()
    };
    for (var k in extra) entry[k] = extra[k];
    return entry;
  }

  function closePopover() { scrim.classList.remove("is-open"); activeTarget = null; }
  scrim.addEventListener("click", function (e) { if (e.target === scrim) closePopover(); });

  function renderTextForm(target) {
    var current = getEditableText(target.el);
    formBody.innerHTML =
      '<h3>' + (target.kind === "knop" ? "Knoptekst aanpassen" : "Tekst aanpassen") + "</h3>" +
      '<p class="fb-target">In <strong>' + (target.section.getAttribute("data-review-label") || "") + "</strong></p>" +
      '<div class="fb-current"><span class="fb-current-label">Huidige tekst</span><p>' + current.replace(/</g, "&lt;") + "</p></div>" +
      '<div class="fb-field"><label for="fb-new-text">Nieuwe tekst</label><textarea id="fb-new-text" placeholder="Hoe zou dit moeten worden?"></textarea></div>' +
      '<div class="fb-actions"><button type="button" class="fb-btn-ghost" id="fb-cancel">Annuleren</button><button type="button" class="fb-btn-save" id="fb-save">Feedback opslaan</button></div>';
    document.getElementById("fb-cancel").addEventListener("click", closePopover);
    document.getElementById("fb-save").addEventListener("click", function () {
      var newText = document.getElementById("fb-new-text").value.trim();
      if (!newText) { document.getElementById("fb-new-text").focus(); return; }
      addEntry(baseEntry(target, { actionType: "tekst-wijziging", oldText: current, newText: newText, message: current + " → " + newText }));
      setEditableText(target.el, newText);
      closePopover();
    });
    window.setTimeout(function () { var f = document.getElementById("fb-new-text"); if (f) f.focus(); }, 150);
  }

  function renderImageForm(target) {
    formBody.innerHTML =
      "<h3>Afbeelding</h3>" +
      '<p class="fb-target">In <strong>' + (target.section.getAttribute("data-review-label") || "") + "</strong></p>" +
      '<div class="fb-field"><label for="fb-img-note">Opmerking</label><textarea id="fb-img-note" placeholder="Wat valt je op aan deze afbeelding?"></textarea></div>' +
      '<label class="fb-checkbox"><input type="checkbox" id="fb-img-replace"><span>Afbeelding vervangen aanvragen</span></label>' +
      '<div class="fb-actions"><button type="button" class="fb-btn-ghost" id="fb-cancel">Annuleren</button><button type="button" class="fb-btn-save" id="fb-save">Feedback opslaan</button></div>';
    document.getElementById("fb-cancel").addEventListener("click", closePopover);
    document.getElementById("fb-save").addEventListener("click", function () {
      var note = document.getElementById("fb-img-note").value.trim();
      var replace = document.getElementById("fb-img-replace").checked;
      if (!note && !replace) { document.getElementById("fb-img-note").focus(); return; }
      addEntry(baseEntry(target, {
        actionType: replace ? "afbeelding-vervangen" : "afbeelding-opmerking",
        message: note || "Vervanging aangevraagd", imageReplace: replace
      }));
      if (replace) (target.el.closest(".media") || target.el).classList.add("fb-image-flagged");
      closePopover();
    });
    window.setTimeout(function () { var f = document.getElementById("fb-img-note"); if (f) f.focus(); }, 150);
  }

  var ACTION_LABELS = {
    up: "Hoger plaatsen", down: "Lager plaatsen", remove: "Verwijderen", adjust: "Aanpassen"
  };
  function renderSectionForm(target) {
    formBody.innerHTML =
      "<h3>Sectie: " + (target.section.getAttribute("data-review-label") || target.sectionId || "") + "</h3>" +
      '<div class="fb-section-actions">' +
        '<button type="button" data-action="up">↑ Hoger plaatsen</button>' +
        '<button type="button" data-action="down">↓ Lager plaatsen</button>' +
        '<button type="button" data-action="remove">🗑 Verwijderen</button>' +
        '<button type="button" data-action="adjust">✎ Aanpassen</button>' +
      "</div>" +
      '<div class="fb-field" id="fb-adjust-wrap" hidden>' +
        '<label for="fb-adjust-text">Wat moet er worden aangepast?</label>' +
        '<textarea id="fb-adjust-text" placeholder="Beschrijf de gewenste aanpassing"></textarea>' +
        '<div class="fb-actions"><button type="button" class="fb-btn-ghost" id="fb-cancel">Annuleren</button><button type="button" class="fb-btn-save" id="fb-save-adjust">Feedback opslaan</button></div>' +
      "</div>";

    formBody.querySelectorAll(".fb-section-actions button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var action = btn.getAttribute("data-action");
        if (action === "adjust") {
          document.getElementById("fb-adjust-wrap").hidden = false;
          document.getElementById("fb-cancel").addEventListener("click", closePopover);
          document.getElementById("fb-save-adjust").addEventListener("click", function () {
            var msg = document.getElementById("fb-adjust-text").value.trim();
            if (!msg) { document.getElementById("fb-adjust-text").focus(); return; }
            addEntry(baseEntry(target, { actionType: "aanpassen", message: msg }));
            closePopover();
          });
          window.setTimeout(function () { document.getElementById("fb-adjust-text").focus(); }, 100);
          return;
        }
        if (action === "up" || action === "down") {
          var moved = moveSection(target.section, action);
          addEntry(baseEntry(target, {
            actionType: action === "up" ? "verplaats-omhoog" : "verplaats-omlaag",
            message: ACTION_LABELS[action] + (moved ? "" : " (al aan de rand)")
          }));
        } else if (action === "remove") {
          target.section.classList.add("fb-marked-removed");
          addEntry(baseEntry(target, { actionType: "verwijderen", message: "Gemarkeerd voor verwijdering" }));
        }
        closePopover();
      });
    });
  }

  function openPopover(target) {
    activeTarget = target;
    document.getElementById("fb-form-kind").textContent = target.kindLabel;
    if (target.kind === "tekst" || target.kind === "knop") renderTextForm(target);
    else if (target.kind === "afbeelding") renderImageForm(target);
    else renderSectionForm(target);
    scrim.classList.add("is-open");
  }

  /* ---- Klik op sectie, afbeelding, tekst of knop ---- */
  document.addEventListener("click", function (e) {
    if (!isActive) return;
    if (e.target.closest(".fb-toggle, .fb-sidebar, .fb-sidebar-scrim, .fb-scrim")) return;
    var section = e.target.closest("[data-review-id]");
    if (!section) return;
    e.preventDefault();
    e.stopPropagation();
    clearHover();
    var target = describeTarget(e.target, section);
    target.section = section;
    openPopover(target);
  }, true);

  /* ---- Sidebar met alle feedback ---- */
  var sidebar = document.createElement("aside");
  sidebar.className = "fb-sidebar";
  sidebar.setAttribute("aria-label", "Feedback op deze website");
  sidebar.innerHTML =
    '<div class="fb-sidebar-head">' +
      '<div><h3>Feedback</h3><p>Opgeslagen op dit apparaat — alle pagina’s, alle secties.</p></div>' +
      '<button type="button" class="fb-close" id="fb-sidebar-close" aria-label="Sluiten">✕</button>' +
    "</div>" +
    '<div class="fb-filter-row" id="fb-filter-row">' +
      '<button type="button" data-filter="all" class="is-active">Alles</button>' +
      STATUS.map(function (s) { return '<button type="button" data-filter="' + s.value + '">' + s.label + "</button>"; }).join("") +
    "</div>" +
    '<div class="fb-list" id="fb-list"></div>';
  document.body.appendChild(sidebar);

  var sidebarScrim = document.createElement("div");
  sidebarScrim.className = "fb-sidebar-scrim";
  document.body.appendChild(sidebarScrim);

  var currentFilter = "all";
  function statusLabel(v) { var s = STATUS.filter(function (x) { return x.value === v; })[0]; return s ? s.label : v; }

  function summarize(i) {
    if (i.actionType === "tekst-wijziging") return "“" + i.oldText + "” → “" + i.newText + "”";
    return i.message || "";
  }

  function renderList() {
    var items = readAll();
    if (currentFilter !== "all") items = items.filter(function (i) { return i.status === currentFilter; });
    var list = document.getElementById("fb-list");
    if (!items.length) {
      list.innerHTML = '<div class="fb-empty">Nog geen feedback' + (currentFilter !== "all" ? " met deze status" : "") + ".</div>";
      return;
    }
    list.innerHTML = items.map(function (i) {
      return (
        '<div class="fb-item" data-id="' + i.id + '">' +
          '<div class="fb-item-top">' +
            '<span class="fb-badge" data-status="' + i.status + '">' + statusLabel(i.status) + "</span>" +
            '<span class="fb-item-kind">' + (i.targetKindLabel || "Sectie") + "</span>" +
          "</div>" +
          '<p class="fb-item-msg">' + summarize(i).replace(/</g, "&lt;") + "</p>" +
          '<div class="fb-item-meta"><strong>' + (i.sectionLabel || i.sectionId || "") + "</strong><span>" + i.path + "</span></div>" +
          '<div class="fb-item-who"><span>' + fmtDate(i.createdAt) + "</span></div>" +
          '<div class="fb-item-foot">' +
            '<select data-id="' + i.id + '" aria-label="Status wijzigen">' +
              STATUS.map(function (s) { return '<option value="' + s.value + '"' + (s.value === i.status ? " selected" : "") + ">" + s.label + "</option>"; }).join("") +
            "</select>" +
            '<button type="button" class="fb-item-del" data-id="' + i.id + '">Verwijderen</button>' +
          "</div>" +
        "</div>"
      );
    }).join("");

    list.querySelectorAll("select[data-id]").forEach(function (sel) {
      sel.addEventListener("change", function () { updateStatus(sel.getAttribute("data-id"), sel.value); });
    });
    list.querySelectorAll(".fb-item-del").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (window.confirm("Deze feedback verwijderen?")) removeEntry(btn.getAttribute("data-id"));
      });
    });
  }

  sidebar.querySelectorAll("#fb-filter-row button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      sidebar.querySelectorAll("#fb-filter-row button").forEach(function (b) { b.classList.remove("is-active"); });
      btn.classList.add("is-active");
      currentFilter = btn.getAttribute("data-filter");
      renderList();
    });
  });
  function openSidebar() { renderList(); sidebar.classList.add("is-open"); sidebarScrim.classList.add("is-open"); }
  function closeSidebar() { sidebar.classList.remove("is-open"); sidebarScrim.classList.remove("is-open"); }
  document.getElementById("fb-sidebar-close").addEventListener("click", closeSidebar);
  sidebarScrim.addEventListener("click", closeSidebar);

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (scrim.classList.contains("is-open")) closePopover();
    if (sidebar.classList.contains("is-open")) closeSidebar();
  });

  /* ================================================================
     Modus aan/uit
     ================================================================ */
  function applyState() {
    document.documentElement.classList.toggle("feedback-mode", isActive);
    toggle.classList.toggle("is-active", isActive);
    toggle.querySelector(".fb-toggle-text").textContent = isActive ? "Feedbackmodus actief" : "Feedbackmodus";
    var countEl = document.getElementById("fb-toggle-count");
    if (isActive) {
      countEl.hidden = false;
      countEl.textContent = String(readAll().length);
    } else {
      countEl.hidden = true;
      clearHover();
      closePopover();
      closeSidebar();
    }
  }
  function setActive(on) {
    isActive = on;
    try { window.localStorage.setItem(ACTIVE_KEY, on ? "1" : "0"); } catch (e) {}
    applyState();
    if (on) openSidebar();
  }
  toggle.addEventListener("click", function () { setActive(!isActive); });

  function refreshAll() {
    var countEl = document.getElementById("fb-toggle-count");
    if (countEl && isActive) countEl.textContent = String(readAll().length);
    if (sidebar.classList.contains("is-open")) renderList();
  }

  applyState();
})();
