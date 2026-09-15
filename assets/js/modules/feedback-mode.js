/* ==========================================================================
   Feedbackmodus — klantvriendelijke, zichtbare reviewlaag ("werk alsof je in
   Figma zit"). Een knop rechtsboven ("💬 Feedbackmodus") schakelt de modus
   voor iedere bezoeker met toegang tot de voorstelwebsite in en uit. De
   voorkeur blijft onthouden (localStorage), ook tussen pagina's.

   Belangrijk gedragsprincipe: feedback is een VOORSTEL, geen directe
   wijziging. De enige uitzondering is tekstfeedback (op platte tekst, geen
   knoppen) — die wordt live op de pagina getoond zodat het verschil meteen
   voelbaar is, en de sidebar toont dan altijd zowel de originele als de
   nieuwe tekst. Verwijder je zo'n tekstfeedback-item, dan wordt de
   oorspronkelijke tekst automatisch teruggezet.

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
  var MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024; // 3MB — lokale opslag (localStorage) heeft weinig ruimte

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
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); return true; } catch (e) { return false; }
  }
  function addEntry(entry) {
    var items = readAll();
    items.unshift(entry);
    var ok = writeAll(items);
    if (!ok) {
      window.alert("Deze feedback kon niet worden opgeslagen — waarschijnlijk is de bijlage te groot voor lokale opslag. Probeer een kleiner bestand.");
      return false;
    }
    refreshAll();
    return true;
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
    var items = readAll();
    var entry = items.filter(function (i) { return i.id === id; })[0];
    writeAll(items.filter(function (i) { return i.id !== id; }));
    if (entry && entry.actionType === "tekst-wijziging") revertLiveText(entry);
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
  }
  /* Vindt (bij dezelfde paginaweergave) het element terug via sectie + huidige
     tekst, zodat een verwijderde tekstfeedback de pagina weer terug kan zetten. */
  function revertLiveText(entry) {
    var section = document.querySelector('[data-review-id="' + entry.sectionId + '"]');
    if (!section) return;
    var candidates = section.querySelectorAll("h1,h2,h3,h4,h5,p,span,li,blockquote,figcaption");
    for (var i = 0; i < candidates.length; i++) {
      var el = candidates[i];
      if (getEditableText(el) === entry.newText) {
        setEditableText(el, entry.oldText);
        el.classList.remove("fb-edited");
        return;
      }
    }
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

  /* ================================================================
     UI opbouwen
     ================================================================ */

  /* ---- Schakelknop rechtsboven + knop om het paneel te (her)openen ---- */
  var toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "fb-toggle";
  toggle.innerHTML = '<span class="fb-toggle-icon">💬</span><span class="fb-toggle-text">Feedbackmodus</span>';
  document.body.appendChild(toggle);

  var panelBtn = document.createElement("button");
  panelBtn.type = "button";
  panelBtn.className = "fb-panel-btn";
  panelBtn.hidden = true;
  panelBtn.setAttribute("aria-label", "Open feedbackoverzicht");
  panelBtn.innerHTML = '<span class="fb-panel-icon">📋</span><span class="fb-count" id="fb-toggle-count">0</span>';
  document.body.appendChild(panelBtn);

  /* ---- Subtiele overlay over de hele site ---- */
  var overlay = document.createElement("div");
  overlay.className = "fb-overlay";
  document.body.appendChild(overlay);

  /* ---- Toast — korte, rustige bevestiging na een voorstel ---- */
  var toast = document.createElement("div");
  toast.className = "fb-toast";
  document.body.appendChild(toast);
  var toastTimer = null;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { toast.classList.remove("is-visible"); }, 2800);
  }

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
    if (e.target.closest(".fb-toggle, .fb-panel-btn, .fb-sidebar, .fb-sidebar-scrim, .fb-scrim")) { clearHover(); return; }
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

  /* ---------------- Bijlage (foto/screenshot/video als lokale referentie) ----------------
     Wordt nog nergens naar een server geüpload; de bestandsinhoud wordt als
     data-URL in het feedback-item zelf opgeslagen (localStorage). */
  var pendingAttachment = null;
  function attachmentFieldHtml() {
    return (
      '<div class="fb-field">' +
        '<label>Bijlage <span class="fb-optional">(optioneel)</span></label>' +
        '<label class="fb-attach-btn" for="fb-attach-input">📎 Bijlage toevoegen</label>' +
        '<input type="file" id="fb-attach-input" accept="image/*,video/*" hidden>' +
        '<div class="fb-attach-preview" id="fb-attach-preview" hidden></div>' +
      "</div>"
    );
  }
  function wireAttachmentField() {
    var input = document.getElementById("fb-attach-input");
    var preview = document.getElementById("fb-attach-preview");
    if (!input) return;
    input.addEventListener("change", function () {
      var file = input.files && input.files[0];
      if (!file) return;
      if (file.size > MAX_ATTACHMENT_BYTES) {
        window.alert("Dit bestand is groter dan 3 MB. Kies een kleiner bestand — lokale opslag heeft weinig ruimte.");
        input.value = "";
        return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        pendingAttachment = { name: file.name, type: file.type, dataUrl: reader.result };
        renderAttachmentPreview();
      };
      reader.readAsDataURL(file);
    });
  }
  function renderAttachmentPreview() {
    var preview = document.getElementById("fb-attach-preview");
    if (!preview) return;
    if (!pendingAttachment) { preview.hidden = true; preview.innerHTML = ""; return; }
    var isImg = pendingAttachment.type.indexOf("image/") === 0;
    preview.hidden = false;
    preview.innerHTML =
      (isImg ? '<img src="' + pendingAttachment.dataUrl + '" alt="">' : '<span class="fb-attach-file">🎞️</span>') +
      '<span class="fb-attach-name">' + pendingAttachment.name + "</span>" +
      '<button type="button" id="fb-attach-remove" aria-label="Bijlage verwijderen">✕</button>';
    document.getElementById("fb-attach-remove").addEventListener("click", function () {
      pendingAttachment = null;
      document.getElementById("fb-attach-input").value = "";
      renderAttachmentPreview();
    });
  }
  function attachmentThumbHtml(att) {
    if (!att) return "";
    var isImg = att.type && att.type.indexOf("image/") === 0;
    return (
      '<div class="fb-item-attachment">' +
        (isImg ? '<img src="' + att.dataUrl + '" alt="">' : '<span class="fb-attach-file">🎞️</span>') +
        '<span>' + att.name + "</span>" +
      "</div>"
    );
  }

  /* ---- Popover: per elementtype andere inhoud ----
     Eén enkele, permanente (delegated) klik-listener op formBody regelt alle
     knoppen binnenin — nooit opnieuw gebonden bij het opnieuw tekenen van de
     inhoud, dus nooit een "dode" Annuleren-knop. */
  var scrim = document.createElement("div");
  scrim.className = "fb-scrim";
  scrim.innerHTML = '<div class="fb-modal" role="dialog" aria-modal="true"><p class="fb-form-kind" id="fb-form-kind">Sectie</p><div id="fb-form-body"></div></div>';
  document.body.appendChild(scrim);
  var formBody = document.getElementById("fb-form-body");

  var activeTarget = null;
  var currentSaveHandler = null;

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
      attachment: pendingAttachment,
      status: "open",
      createdAt: new Date().toISOString()
    };
    for (var k in extra) entry[k] = extra[k];
    return entry;
  }

  function closePopover() {
    scrim.classList.remove("is-open");
    activeTarget = null;
    currentSaveHandler = null;
    pendingAttachment = null;
  }

  /* Eén permanente delegated handler — geldig voor élk formuliertype dat
     hierna ooit in #fb-form-body wordt getekend. */
  scrim.addEventListener("click", function (e) {
    if (e.target === scrim) { closePopover(); return; }
    if (e.target.closest("#fb-cancel")) { closePopover(); return; }
    if (e.target.closest("#fb-save") || e.target.closest("#fb-save-adjust")) {
      if (typeof currentSaveHandler === "function") currentSaveHandler();
      return;
    }
    var actionBtn = e.target.closest("[data-action]");
    if (actionBtn) { handleSectionAction(actionBtn.getAttribute("data-action")); return; }
  });

  function renderTextForm(target) {
    var current = getEditableText(target.el);
    var isText = target.kind === "tekst";
    formBody.innerHTML =
      "<h3>" + (isText ? "Tekst aanpassen" : "Voorstel voor nieuwe knoptekst") + "</h3>" +
      '<p class="fb-target">In <strong>' + (target.section.getAttribute("data-review-label") || "") + "</strong></p>" +
      (isText
        ? '<p class="fb-hint-copy">Deze wijziging wordt direct op de pagina getoond, als voorbeeld.</p>'
        : '<p class="fb-hint-copy">Dit is een voorstel — de knop op de pagina verandert niet vanzelf.</p>') +
      '<div class="fb-current"><span class="fb-current-label">Huidige tekst</span><p>' + current.replace(/</g, "&lt;") + "</p></div>" +
      '<div class="fb-field"><label for="fb-new-text">' + (isText ? "Nieuwe tekst" : "Voorgestelde tekst") + '</label><textarea id="fb-new-text" placeholder="Hoe zou dit moeten worden?"></textarea></div>' +
      attachmentFieldHtml() +
      '<div class="fb-actions"><button type="button" class="fb-btn-ghost" id="fb-cancel">Annuleren</button><button type="button" class="fb-btn-save" id="fb-save">Feedback opslaan</button></div>';
    wireAttachmentField();

    currentSaveHandler = function () {
      var newText = document.getElementById("fb-new-text").value.trim();
      if (!newText) { document.getElementById("fb-new-text").focus(); return; }
      if (isText) {
        var saved = addEntry(baseEntry(target, { actionType: "tekst-wijziging", oldText: current, newText: newText, message: current + " → " + newText }));
        if (saved) { setEditableText(target.el, newText); target.el.classList.add("fb-edited"); showToast("Tekst bijgewerkt — je voorstel staat in het paneel."); closePopover(); }
      } else {
        var saved2 = addEntry(baseEntry(target, { actionType: "knop-suggestie", oldText: current, newText: newText, message: "Voorstel: \"" + current + "\" → \"" + newText + "\"" }));
        if (saved2) { showToast("Voorstel opgeslagen."); closePopover(); }
      }
    };
    window.setTimeout(function () { var f = document.getElementById("fb-new-text"); if (f) f.focus(); }, 150);
  }

  function renderImageForm(target) {
    formBody.innerHTML =
      "<h3>Voorstel voor deze afbeelding</h3>" +
      '<p class="fb-target">In <strong>' + (target.section.getAttribute("data-review-label") || "") + "</strong></p>" +
      '<p class="fb-hint-copy">Dit wordt als voorstel opgeslagen — de afbeelding zelf verandert niet.</p>' +
      '<div class="fb-field"><label for="fb-img-note">Opmerking</label><textarea id="fb-img-note" placeholder="Bijvoorbeeld: gebruik liever een andere foto"></textarea></div>' +
      '<label class="fb-checkbox"><input type="checkbox" id="fb-img-replace"><span>Andere afbeelding voorstellen</span></label>' +
      attachmentFieldHtml() +
      '<div class="fb-actions"><button type="button" class="fb-btn-ghost" id="fb-cancel">Annuleren</button><button type="button" class="fb-btn-save" id="fb-save">Feedback opslaan</button></div>';
    wireAttachmentField();

    currentSaveHandler = function () {
      var note = document.getElementById("fb-img-note").value.trim();
      var replace = document.getElementById("fb-img-replace").checked;
      if (!note && !replace && !pendingAttachment) { document.getElementById("fb-img-note").focus(); return; }
      var msg = note ? "Voorstel: " + note : "Voorstel: andere afbeelding gewenst";
      var saved = addEntry(baseEntry(target, { actionType: replace ? "afbeelding-vervangen" : "afbeelding-opmerking", message: msg, imageReplace: replace }));
      if (saved) {
        if (replace || pendingAttachment) (target.el.closest(".media") || target.el).classList.add("fb-image-flagged");
        showToast("Voorstel opgeslagen.");
        closePopover();
      }
    };
    window.setTimeout(function () { var f = document.getElementById("fb-img-note"); if (f) f.focus(); }, 150);
  }

  var ACTION_LABELS = {
    up: "Deze sectie hoger op de pagina",
    down: "Deze sectie lager op de pagina",
    remove: "Deze sectie verwijderen",
    adjust: "Inhoud van deze sectie aanpassen"
  };
  var activeSectionTarget = null;
  function renderSectionForm(target) {
    activeSectionTarget = target;
    formBody.innerHTML =
      "<h3>Sectie: " + (target.section.getAttribute("data-review-label") || target.sectionId || "") + "</h3>" +
      '<p class="fb-hint-copy">Kies wat je wilt voorstellen — dit wordt vastgelegd als suggestie, de pagina verandert niet.</p>' +
      '<div class="fb-section-actions">' +
        '<button type="button" data-action="up"><span>↑</span>' + ACTION_LABELS.up + "</button>" +
        '<button type="button" data-action="down"><span>↓</span>' + ACTION_LABELS.down + "</button>" +
        '<button type="button" data-action="remove"><span>🗑</span>' + ACTION_LABELS.remove + "</button>" +
        '<button type="button" data-action="adjust"><span>✎</span>' + ACTION_LABELS.adjust + "</button>" +
      "</div>" +
      '<div class="fb-field" id="fb-adjust-wrap" hidden>' +
        '<label for="fb-adjust-text">Wat moet er worden aangepast?</label>' +
        '<textarea id="fb-adjust-text" placeholder="Beschrijf de gewenste aanpassing — bijvoorbeeld tekst, foto’s, opmaak of inhoud"></textarea>' +
        attachmentFieldHtml() +
        '<div class="fb-actions"><button type="button" class="fb-btn-ghost" id="fb-cancel">Annuleren</button><button type="button" class="fb-btn-save" id="fb-save-adjust">Feedback opslaan</button></div>' +
      "</div>";

    currentSaveHandler = function () {
      var msg = document.getElementById("fb-adjust-text").value.trim();
      if (!msg) { document.getElementById("fb-adjust-text").focus(); return; }
      var saved = addEntry(baseEntry(target, { actionType: "sectie-aanpassen", message: "Voorstel: " + msg }));
      if (saved) { showToast("Voorstel opgeslagen."); closePopover(); }
    };
  }

  function handleSectionAction(action) {
    var target = activeSectionTarget;
    if (!target) return;
    if (action === "adjust") {
      document.getElementById("fb-adjust-wrap").hidden = false;
      wireAttachmentField();
      window.setTimeout(function () { document.getElementById("fb-adjust-text").focus(); }, 100);
      return;
    }
    var actionType = action === "up" ? "sectie-hoger" : action === "down" ? "sectie-lager" : "sectie-verwijderen";
    var saved = addEntry(baseEntry(target, { actionType: actionType, message: "Voorstel: " + ACTION_LABELS[action] }));
    if (saved) { showToast("Voorstel opgeslagen: " + ACTION_LABELS[action].toLowerCase() + "."); closePopover(); }
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
    if (e.target.closest(".fb-toggle, .fb-panel-btn, .fb-sidebar, .fb-sidebar-scrim, .fb-scrim, .fb-intro-scrim")) return;
    var section = e.target.closest("[data-review-id]");
    if (!section) return;
    e.preventDefault();
    e.stopPropagation();
    clearHover();
    var target = describeTarget(e.target, section);
    target.section = section;
    openPopover(target);
  }, true);

  /* ---------------- Algemene feedbackvraag (eerste stap bij activeren) ---------------- */
  var introScrim = document.createElement("div");
  introScrim.className = "fb-scrim fb-intro-scrim";
  introScrim.innerHTML =
    '<div class="fb-modal fb-intro-modal" role="dialog" aria-modal="true">' +
      "<h3>Wat vind je van het ontwerp?</h3>" +
      '<p class="fb-hint-copy">Deel eerst je algemene indruk. Daarna kun je op elk onderdeel van de pagina klikken voor gerichte feedback.</p>' +
      '<div class="fb-field"><label for="fb-intro-like">Wat spreekt je aan?</label><textarea id="fb-intro-like" placeholder="Wat vind je nu al goed?"></textarea></div>' +
      '<div class="fb-field"><label for="fb-intro-change">Wat moet er nog worden aangepast?</label><textarea id="fb-intro-change" placeholder="Denk aan: kleuren, lettertypes, foto’s, video’s, teksten, uitstraling, navigatie"></textarea></div>' +
      '<div class="fb-actions"><button type="button" class="fb-btn-ghost" id="fb-intro-skip">Overslaan</button><button type="button" class="fb-btn-save" id="fb-intro-save">Versturen</button></div>' +
    "</div>";
  document.body.appendChild(introScrim);

  function closeIntro() { introScrim.classList.remove("is-open"); }
  introScrim.addEventListener("click", function (e) {
    if (e.target === introScrim || e.target.closest("#fb-intro-skip")) { closeIntro(); return; }
    if (e.target.closest("#fb-intro-save")) {
      var like = document.getElementById("fb-intro-like").value.trim();
      var change = document.getElementById("fb-intro-change").value.trim();
      if (like || change) {
        var parts = [];
        if (like) parts.push("Wat spreekt aan: " + like);
        if (change) parts.push("Wat moet worden aangepast: " + change);
        addEntry({
          id: uid(), path: window.location.pathname, pageTitle: document.title,
          sectionId: "algemeen", sectionLabel: "Algemene indruk",
          targetKind: "algemeen", targetKindLabel: "Algemeen", targetDetail: "",
          actionType: "algemeen", message: parts.join("\n\n"), attachment: null,
          status: "open", createdAt: new Date().toISOString()
        });
        showToast("Bedankt voor je feedback!");
      }
      closeIntro();
    }
  });
  function openIntro() {
    document.getElementById("fb-intro-like").value = "";
    document.getElementById("fb-intro-change").value = "";
    introScrim.classList.add("is-open");
  }

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

  function itemBodyHtml(i) {
    if (i.actionType === "tekst-wijziging" || i.actionType === "knop-suggestie") {
      return (
        '<div class="fb-diff">' +
          '<div class="fb-diff-row"><span class="fb-diff-label">Origineel</span><p>' + (i.oldText || "").replace(/</g, "&lt;") + "</p></div>" +
          '<div class="fb-diff-row fb-diff-new"><span class="fb-diff-label">Nieuw</span><p>' + (i.newText || "").replace(/</g, "&lt;") + "</p></div>" +
        "</div>"
      );
    }
    return '<p class="fb-item-msg">' + (i.message || "").replace(/</g, "&lt;") + "</p>";
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
          itemBodyHtml(i) +
          attachmentThumbHtml(i.attachment) +
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
        if (window.confirm("Deze feedback verwijderen? Een tekstwijziging wordt dan ook teruggezet naar de oorspronkelijke tekst.")) removeEntry(btn.getAttribute("data-id"));
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
  panelBtn.addEventListener("click", openSidebar);

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (scrim.classList.contains("is-open")) closePopover();
    if (introScrim.classList.contains("is-open")) closeIntro();
    if (sidebar.classList.contains("is-open")) closeSidebar();
  });

  /* ================================================================
     Modus aan/uit
     ================================================================ */
  function applyState() {
    document.documentElement.classList.toggle("feedback-mode", isActive);
    toggle.classList.toggle("is-active", isActive);
    toggle.querySelector(".fb-toggle-text").textContent = isActive ? "Feedbackmodus actief" : "Feedbackmodus";
    panelBtn.hidden = !isActive;
    if (isActive) {
      document.getElementById("fb-toggle-count").textContent = String(readAll().length);
    } else {
      clearHover();
      closePopover();
      closeIntro();
      closeSidebar();
    }
  }
  function setActiveCore(on) {
    isActive = on;
    try { window.localStorage.setItem(ACTIVE_KEY, on ? "1" : "0"); } catch (e) {}
    applyState();
  }
  toggle.addEventListener("click", function () {
    var turningOn = !isActive;
    setActiveCore(turningOn);
    if (turningOn) openIntro();
  });

  function refreshAll() {
    var countEl = document.getElementById("fb-toggle-count");
    if (countEl && isActive) countEl.textContent = String(readAll().length);
    if (sidebar.classList.contains("is-open")) renderList();
  }

  applyState();
})();
