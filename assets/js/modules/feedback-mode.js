/* ==========================================================================
   Feedbackmodus — klantvriendelijke, zichtbare reviewlaag ("werk alsof je in
   Figma zit"). Een knop rechtsboven ("💬 Feedbackmodus") schakelt de modus
   voor iedere bezoeker met toegang tot de voorstelwebsite in en uit.

   Opslag: Supabase (tabel "feedback_items", bucket "feedback-attachments")
   — centraal en gedeeld tussen alle bezoekers/apparaten, met live-updates
   via Supabase Realtime. Zie supabase/schema.sql voor het volledige
   databaseschema. Alleen de "is feedbackmodus aan?"- en
   "heb ik de intro al gezien?"-voorkeur blijven per apparaat in
   localStorage staan — dat is puur lokale UI-status, geen feedbackdata.

   Belangrijk gedragsprincipe: feedback is een VOORSTEL, geen directe
   wijziging. De enige uitzondering is tekstfeedback (op platte tekst, geen
   knoppen) — die wordt live op de pagina getoond zodat het verschil meteen
   voelbaar is, en de sidebar toont dan altijd zowel de originele als de
   nieuwe tekst. Verwijder je zo'n tekstfeedback-item, dan wordt de
   oorspronkelijke tekst automatisch teruggezet — ook als iemand anders
   'm ergens anders verwijdert, via het realtime-DELETE-event.

   Alles wordt getoond in een donker feedbackpaneel rechts, met datum,
   elementtype en status (Open / In behandeling / Afgerond).
   ========================================================================== */
(function () {
  "use strict";
  var SUPABASE_URL = "https://wxpyvoisvmtrclztgdrk.supabase.co";
  var SUPABASE_KEY = "sb_publishable_sfXqpISGr8lwpIeZxWfELg_KVHCi5mX";
  var TABLE = "feedback_items";
  var BUCKET = "feedback-attachments";

  var ACTIVE_KEY = "dvsFeedbackModeOn";
  var ONBOARDED_KEY = "dvsFeedbackOnboarded";
  var STATUS = [
    { value: "open", label: "Open" },
    { value: "in-behandeling", label: "In behandeling" },
    { value: "afgerond", label: "Afgerond" }
  ];
  var MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024; // 50MB — nu in Supabase Storage, ruimte is geen probleem meer

  var isActive = false;
  try { isActive = window.localStorage.getItem(ACTIVE_KEY) === "1"; } catch (e) {}
  var onboarded = false;
  try { onboarded = window.localStorage.getItem(ONBOARDED_KEY) === "1"; } catch (e) {}

  /* ---------------- Supabase-client ----------------
     Werkt de site zonder internet of is de CDN geblokkeerd, dan blijft de
     UI gewoon werken (lokaal, niet-gedeeld) in plaats van te crashen. */
  var sb = (typeof window.supabase !== "undefined")
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;
  if (!sb) console.warn("Feedbackmodus: Supabase-client kon niet worden geladen — feedback wordt niet gedeeld.");

  /* ---------------- Opslag ----------------
     "cache" is de lokale spiegel van de feedback_items-tabel: gevuld bij
     het laden en daarna bijgehouden via realtime-events. Schrijfacties zijn
     optimistisch — de UI werkt direct bij, het Supabase-verzoek loopt op de
     achtergrond mee. Zo blijft de bediening exact even snel aanvoelen als
     met localStorage, terwijl alles nu centraal staat. */
  var cache = [];

  function readAll() {
    return cache.slice().sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
  }
  function upsertCache(entry) {
    var idx = cache.findIndex(function (i) { return i.id === entry.id; });
    if (idx === -1) cache.unshift(entry); else cache[idx] = entry;
  }
  function removeFromCache(id) {
    cache = cache.filter(function (i) { return i.id !== id; });
  }

  function rowToEntry(row) {
    return {
      id: row.id, path: row.path, pageTitle: row.page_title,
      sectionId: row.section_id, sectionLabel: row.section_label,
      targetKind: row.target_kind, targetKindLabel: row.target_kind_label, targetDetail: row.target_detail,
      actionType: row.action_type, message: row.message,
      oldText: row.old_text, newText: row.new_text,
      like: row.like_text, change: row.change_text,
      attachment: row.attachment_url ? { name: row.attachment_name, type: row.attachment_type, dataUrl: row.attachment_url } : null,
      imageReplace: row.image_replace, status: row.status,
      createdAt: row.created_at, updatedAt: row.updated_at
    };
  }
  function entryToRow(entry) {
    return {
      id: entry.id, path: entry.path, page_title: entry.pageTitle,
      section_id: entry.sectionId, section_label: entry.sectionLabel,
      target_kind: entry.targetKind, target_kind_label: entry.targetKindLabel, target_detail: entry.targetDetail,
      action_type: entry.actionType, message: entry.message,
      old_text: entry.oldText || null, new_text: entry.newText || null,
      like_text: entry.like || null, change_text: entry.change || null,
      attachment_url: entry.attachment ? entry.attachment.dataUrl : null,
      attachment_name: entry.attachment ? entry.attachment.name : null,
      attachment_type: entry.attachment ? entry.attachment.type : null,
      image_replace: !!entry.imageReplace, status: entry.status,
      created_at: entry.createdAt, updated_at: entry.updatedAt || null
    };
  }

  function addEntry(entry) {
    upsertCache(entry);
    refreshAll();
    if (sb) {
      sb.from(TABLE).insert(entryToRow(entry)).then(function (res) {
        if (res.error) {
          console.error("Feedback opslaan mislukt:", res.error);
          window.alert("Deze feedback kon niet worden opgeslagen. Controleer je internetverbinding en probeer opnieuw.");
          removeFromCache(entry.id);
          // Bij mislukte opslag ook de live tekstwijziging terugdraaien —
          // anders oogt de pagina bijgewerkt terwijl er niets is vastgelegd.
          if (entry.actionType === "tekst-wijziging") revertLiveText(entry);
          refreshAll();
        }
      });
    }
    return true;
  }
  function updateStatus(id, status) {
    var entry = cache.filter(function (i) { return i.id === id; })[0];
    if (entry) { entry.status = status; entry.updatedAt = new Date().toISOString(); }
    refreshAll();
    if (sb) {
      sb.from(TABLE).update({ status: status, updated_at: new Date().toISOString() }).eq("id", id).then(function (res) {
        if (res.error) { console.error("Status bijwerken mislukt:", res.error); window.alert("Status bijwerken is niet gelukt. Controleer je internetverbinding."); }
      });
    }
  }
  function removeEntry(id) {
    var entry = cache.filter(function (i) { return i.id === id; })[0];
    removeFromCache(id);
    if (entry && entry.actionType === "tekst-wijziging") revertLiveText(entry);
    refreshAll();
    if (sb) {
      sb.from(TABLE).delete().eq("id", id).then(function (res) {
        if (res.error) console.error("Feedback verwijderen mislukt:", res.error);
      });
    }
  }
  function updateEntryFields(id, fields) {
    var entry = cache.filter(function (i) { return i.id === id; })[0];
    if (entry) { for (var k in fields) entry[k] = fields[k]; entry.updatedAt = new Date().toISOString(); }
    refreshAll();
    if (sb) {
      var row = { updated_at: new Date().toISOString() };
      if ("like" in fields) row.like_text = fields.like;
      if ("change" in fields) row.change_text = fields.change;
      if ("message" in fields) row.message = fields.message;
      sb.from(TABLE).update(row).eq("id", id).then(function (res) {
        if (res.error) { console.error("Bijwerken mislukt:", res.error); window.alert("Bijwerken is niet gelukt. Controleer je internetverbinding."); }
      });
    }
  }

  function loadInitial() {
    if (!sb) return;
    sb.from(TABLE).select("*").order("created_at", { ascending: false }).then(function (res) {
      if (res.error) { console.error("Feedback laden mislukt:", res.error); return; }
      cache = (res.data || []).map(rowToEntry);
      refreshAll();
    });
  }

  function initRealtime() {
    if (!sb) return;
    sb.channel("feedback-items-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: TABLE }, function (payload) {
        upsertCache(rowToEntry(payload.new));
        refreshAll();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: TABLE }, function (payload) {
        upsertCache(rowToEntry(payload.new));
        refreshAll();
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: TABLE }, function (payload) {
        var old = payload.old && payload.old.id ? rowToEntry(payload.old) : null;
        if (old) {
          removeFromCache(old.id);
          if (old.actionType === "tekst-wijziging") revertLiveText(old);
        }
        refreshAll();
      })
      .subscribe();
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

  /* ---- Schakelknop rechtsboven + knop om het overzicht te (her)openen ----
     Groot en uitnodigend: dit is de enige ingang tot de hele feedbackmodus,
     dus moet in één oogopslag duidelijk zijn wat hij doet. Beide knoppen
     zitten in één flex-rij, zodat hun volle (tekst-afhankelijke) breedte
     nooit hoeft te worden uitgerekend of kan overlappen. */
  var headerControls = document.createElement("div");
  headerControls.className = "fb-header-controls";
  document.body.appendChild(headerControls);

  var panelBtn = document.createElement("button");
  panelBtn.type = "button";
  panelBtn.className = "fb-panel-btn";
  panelBtn.hidden = true;
  panelBtn.setAttribute("aria-label", "Open mijn feedback");
  panelBtn.innerHTML = '<span class="fb-panel-icon">📋</span><span class="fb-panel-text">Mijn feedback</span><span class="fb-count" id="fb-toggle-count">0</span>';
  headerControls.appendChild(panelBtn);

  var toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "fb-toggle";
  toggle.innerHTML = '<span class="fb-toggle-icon">💬</span><span class="fb-toggle-text">Feedback geven</span>';
  headerControls.appendChild(toggle);

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
    if (e.target.closest(".fb-header-controls, .fb-sidebar, .fb-sidebar-scrim, .fb-scrim")) { clearHover(); return; }
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

  /* ---------------- Bijlage (foto/screenshot/video) ----------------
     Wordt direct geüpload naar Supabase Storage ("feedback-attachments");
     het feedback-item bewaart alleen de openbare URL, niet het bestand
     zelf — zo blijft elk item klein, ongeacht de bestandsgrootte. */
  var pendingAttachment = null;
  var uploadInFlight = false;
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
  function uploadAttachment(file) {
    if (!sb) return Promise.reject(new Error("Geen verbinding met Supabase."));
    var ext = (file.name.split(".").pop() || "bestand").toLowerCase().replace(/[^a-z0-9]/g, "");
    var path = uid() + (ext ? "." + ext : "");
    return sb.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined }).then(function (res) {
      if (res.error) throw res.error;
      var pub = sb.storage.from(BUCKET).getPublicUrl(path);
      return pub.data.publicUrl;
    });
  }
  function wireAttachmentField() {
    var input = document.getElementById("fb-attach-input");
    if (!input) return;
    input.addEventListener("change", function () {
      var file = input.files && input.files[0];
      if (!file) return;
      if (file.size > MAX_ATTACHMENT_BYTES) {
        window.alert("Dit bestand is groter dan 50 MB. Kies een kleiner bestand.");
        input.value = "";
        return;
      }
      uploadInFlight = true;
      renderAttachmentUploading(file.name);
      uploadAttachment(file).then(function (publicUrl) {
        uploadInFlight = false;
        pendingAttachment = { name: file.name, type: file.type, dataUrl: publicUrl };
        renderAttachmentPreview();
      }).catch(function (err) {
        uploadInFlight = false;
        console.error("Bijlage uploaden mislukt:", err);
        window.alert("Deze bijlage kon niet worden geüpload. Controleer je internetverbinding en probeer opnieuw.");
        input.value = "";
        renderAttachmentPreview();
      });
    });
  }
  function renderAttachmentUploading(name) {
    var preview = document.getElementById("fb-attach-preview");
    if (!preview) return;
    preview.hidden = false;
    preview.innerHTML = '<span class="fb-attach-file">⏳</span><span class="fb-attach-name">Bezig met uploaden — ' + name + "</span>";
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
      if (uploadInFlight) { window.alert("Even geduld — de bijlage wordt nog geüpload."); return; }
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
    if (e.target.closest(".fb-header-controls, .fb-sidebar, .fb-sidebar-scrim, .fb-scrim, .fb-intro-scrim")) return;
    var section = e.target.closest("[data-review-id]");
    if (!section) return;
    e.preventDefault();
    e.stopPropagation();
    clearHover();
    var target = describeTarget(e.target, section);
    target.section = section;
    openPopover(target);
  }, true);

  /* ---------------- Welkom + eenmalige ontwerpvragen ----------------
     Verschijnt alleen bij de allereerste keer dat iemand feedbackmodus
     inschakelt: legt in drie stappen uit hoe het werkt en vraagt in
     dezelfde stap één keer naar een algemene indruk. Die antwoorden
     worden daarna nooit opnieuw afgedwongen — ze blijven gewoon
     bewerkbaar via "Bewerken" bij dat item in het overzicht. */
  var introScrim = document.createElement("div");
  introScrim.className = "fb-scrim fb-intro-scrim";
  document.body.appendChild(introScrim);

  var introMode = "onboarding"; // "onboarding" | "edit"
  var editingGeneralId = null;

  function introHtml(isOnboarding) {
    return (
      '<div class="fb-modal fb-intro-modal" role="dialog" aria-modal="true">' +
        (isOnboarding
          ? "<h3>Welkom! Zo werkt feedback geven</h3>" +
            '<div class="fb-steps">' +
              '<div class="fb-step"><span class="fb-step-num">1</span><p>Klik ergens op de pagina — op een tekst, foto, knop of hele sectie.</p></div>' +
              '<div class="fb-step"><span class="fb-step-num">2</span><p>Typ je opmerking of voorstel en sla ’m op.</p></div>' +
              '<div class="fb-step"><span class="fb-step-num">3</span><p>Bekijk alles terug via “Mijn feedback” rechtsboven.</p></div>' +
            "</div>" +
            '<hr class="fb-divider">' +
            "<h4>Wat vind je van het ontwerp?</h4>" +
            '<p class="fb-hint-copy">Dit vragen we je maar één keer — je kunt je antwoord later altijd aanpassen.</p>'
          : "<h3>Algemene indruk bewerken</h3>") +
        '<div class="fb-field"><label for="fb-intro-like">Wat spreekt je aan?</label><textarea id="fb-intro-like" placeholder="Wat vind je nu al goed?"></textarea></div>' +
        '<div class="fb-field"><label for="fb-intro-change">Wat moet er nog worden aangepast?</label><textarea id="fb-intro-change" placeholder="Denk aan: kleuren, lettertypes, foto’s, video’s, teksten, uitstraling, navigatie"></textarea></div>' +
        '<div class="fb-actions"><button type="button" class="fb-btn-ghost" id="fb-intro-skip">' + (isOnboarding ? "Overslaan" : "Annuleren") + "</button>" +
        '<button type="button" class="fb-btn-save fb-btn-lg" id="fb-intro-save">' + (isOnboarding ? "Versturen en beginnen" : "Opslaan") + "</button></div>" +
      "</div>"
    );
  }

  function markOnboarded() {
    onboarded = true;
    try { window.localStorage.setItem(ONBOARDED_KEY, "1"); } catch (e) {}
  }
  function closeIntro() { introScrim.classList.remove("is-open"); editingGeneralId = null; }
  introScrim.addEventListener("click", function (e) {
    if (e.target === introScrim || e.target.closest("#fb-intro-skip")) {
      if (introMode === "onboarding") markOnboarded();
      closeIntro();
      return;
    }
    if (e.target.closest("#fb-intro-save")) {
      var like = document.getElementById("fb-intro-like").value.trim();
      var change = document.getElementById("fb-intro-change").value.trim();
      var parts = [];
      if (like) parts.push("Wat spreekt aan: " + like);
      if (change) parts.push("Wat moet worden aangepast: " + change);
      var message = parts.join("\n\n");

      if (introMode === "edit" && editingGeneralId) {
        updateEntryFields(editingGeneralId, { like: like, change: change, message: message });
        showToast("Bijgewerkt.");
      } else {
        if (like || change) {
          addEntry({
            id: uid(), path: window.location.pathname, pageTitle: document.title,
            sectionId: "algemeen", sectionLabel: "Algemene indruk",
            targetKind: "algemeen", targetKindLabel: "Algemeen", targetDetail: "",
            actionType: "algemeen", like: like, change: change, message: message, attachment: null,
            status: "open", createdAt: new Date().toISOString()
          });
          showToast("Bedankt voor je feedback!");
        }
        markOnboarded();
      }
      closeIntro();
    }
  });
  function openOnboarding() {
    introMode = "onboarding";
    introScrim.innerHTML = introHtml(true);
    document.getElementById("fb-intro-like").value = "";
    document.getElementById("fb-intro-change").value = "";
    introScrim.classList.add("is-open");
    window.setTimeout(function () { var f = document.getElementById("fb-intro-like"); if (f) f.focus(); }, 150);
  }
  function openIntroEdit(entry) {
    introMode = "edit";
    editingGeneralId = entry.id;
    introScrim.innerHTML = introHtml(false);
    document.getElementById("fb-intro-like").value = entry.like || "";
    document.getElementById("fb-intro-change").value = entry.change || "";
    introScrim.classList.add("is-open");
    window.setTimeout(function () { var f = document.getElementById("fb-intro-like"); if (f) f.focus(); }, 150);
  }

  /* ---- Overzicht met alle feedback ("Mijn feedback") ----
     Zo eenvoudig mogelijk gehouden: geen technische velden (paginapad,
     dubbele statuslabels), grote duidelijke statusknoppen in plaats van
     een uitklaplijst, en grote leesbare tekst. */
  var sidebar = document.createElement("aside");
  sidebar.className = "fb-sidebar";
  sidebar.setAttribute("aria-label", "Mijn feedback");
  sidebar.innerHTML =
    '<div class="fb-sidebar-head">' +
      '<div><h3>Mijn feedback</h3><p>Al je opmerkingen, overzichtelijk bij elkaar.</p></div>' +
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
      var isGeneral = i.actionType === "algemeen";
      var kindLine = i.targetKindLabel || "Sectie";
      if (i.sectionLabel && !isGeneral) kindLine += " · " + i.sectionLabel;
      return (
        '<div class="fb-item" data-id="' + i.id + '">' +
          '<div class="fb-item-top">' +
            '<span class="fb-item-kind">' + kindLine + "</span>" +
            '<span class="fb-item-date">' + fmtDate(i.createdAt) + "</span>" +
          "</div>" +
          itemBodyHtml(i) +
          attachmentThumbHtml(i.attachment) +
          '<div class="fb-item-foot">' +
            '<div class="fb-status-group" role="group" aria-label="Status">' +
              STATUS.map(function (s) {
                return '<button type="button" class="fb-status-btn" data-status="' + s.value + '" data-id="' + i.id + '"' + (s.value === i.status ? ' aria-pressed="true"' : "") + ">" + s.label + "</button>";
              }).join("") +
            "</div>" +
            '<div class="fb-item-actions">' +
              (isGeneral ? '<button type="button" class="fb-item-edit" data-id="' + i.id + '">Bewerken</button>' : "") +
              '<button type="button" class="fb-item-del" data-id="' + i.id + '">Verwijderen</button>' +
            "</div>" +
          "</div>" +
        "</div>"
      );
    }).join("");

    list.querySelectorAll(".fb-status-btn").forEach(function (btn) {
      btn.addEventListener("click", function () { updateStatus(btn.getAttribute("data-id"), btn.getAttribute("data-status")); });
    });
    list.querySelectorAll(".fb-item-edit").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var entry = readAll().filter(function (i) { return i.id === btn.getAttribute("data-id"); })[0];
        if (entry) openIntroEdit(entry);
      });
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
    toggle.querySelector(".fb-toggle-text").textContent = isActive ? "Feedback actief" : "Feedback geven";
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
    if (turningOn && !onboarded) openOnboarding();
  });

  function refreshAll() {
    var countEl = document.getElementById("fb-toggle-count");
    if (countEl && isActive) countEl.textContent = String(readAll().length);
    if (sidebar.classList.contains("is-open")) renderList();
  }

  applyState();
  loadInitial();
  initRealtime();
})();
