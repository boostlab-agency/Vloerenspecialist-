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
  /* Nooit twee keer opstarten (bijv. als header.js de tool ook laadt). */
  if (window.__dvsFeedbackMode) return;
  window.__dvsFeedbackMode = true;
  var SUPABASE_URL = "https://wxpyvoisvmtrclztgdrk.supabase.co";
  var SUPABASE_KEY = "sb_publishable_sfXqpISGr8lwpIeZxWfELg_KVHCi5mX";
  var TABLE = "feedback_items";
  var SESSIONS_TABLE = "feedback_sessions";
  var BUCKET = "feedback-attachments";
  var NOTIFY_ENDPOINT = "/api/notify-feedback";
  var INACTIVITY_MS = 50 * 60 * 1000; // 50 minuten

  var ACTIVE_KEY = "dvsFeedbackModeOn";
  var ONBOARDED_KEY = "dvsFeedbackOnboarded";
  /* Sessie-status leeft bewust in sessionStorage (niet localStorage): dat
     verloopt vanzelf zodra het tabblad dicht gaat, precies zoals "per
     sessie" bedoeld is voor de eenmalige e-mailnotificatie. */
  var SESSION_KEY = "dvsFeedbackSessionId";
  var EMAIL_SENT_KEY = "dvsFeedbackEmailSent";
  /* Kolommen die pas ná feedback_items zijn toegevoegd (zie
     supabase/schema_v2_sessions.sql en schema_v3_theme.sql). Als zo'n
     migratie op een omgeving nog niet is uitgevoerd, wijst Postgres het
     hele insert-verzoek af zodra deze velden worden meegestuurd — dat mag
     nooit de basisfeedback zelf blokkeren, dus die velden zijn hersteloptioneel. */
  var OPTIONAL_ROW_FIELDS = ["session_id"];

  /* Herkent "kolom/tabel bestaat niet"-fouten van Postgres/PostgREST, zowel
     de klassieke Postgres-foutcode (42703) als PostgREST's eigen schema-
     cache-variant (PGRST204/PGRST205), onafhankelijk van de exacte tekst. */
  function isMissingSchemaError(error) {
    if (!error) return false;
    var code = String(error.code || "");
    var msg = String(error.message || "").toLowerCase();
    return code === "42703" || code === "PGRST204" || code === "PGRST205" ||
      (msg.indexOf("does not exist") !== -1 && msg.indexOf("column") !== -1) ||
      msg.indexOf("could not find") !== -1;
  }

  /* Eén plek die de volledige Supabase-foutdetails logt (in plaats van
     alleen de generieke "controleer je internetverbinding"-melding) én een
     korte, bruikbare tekst teruggeeft voor in de gebruikersmelding. */
  function logSupabaseError(context, error) {
    console.error(
      "[Feedbackmodus] " + context + " — Supabase-fout:",
      "\n  code:", error && error.code,
      "\n  message:", error && error.message,
      "\n  details:", error && error.details,
      "\n  hint:", error && error.hint
    );
    return (error && (error.message || error.hint || error.code)) || "onbekende fout";
  }
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
      imageReplace: row.image_replace, status: row.status, sessionId: row.session_id,
      createdAt: row.created_at, updatedAt: row.updated_at
    };
  }
  function entryToRow(entry) {
    return {
      id: entry.id, path: entry.path, page_title: entry.pageTitle,
      session_id: entry.sessionId || null,
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
    armInactivityTimer();
    if (sb) {
      var row = entryToRow(entry);
      // Wacht eerst tot een eventueel nog lopende sessie-aanmaak is
      // afgerond (zie ensureSessionId) — anders schendt dit item de
      // foreign-key-constraint naar feedback_sessions vrijwel gegarandeerd.
      // Is het aanmaken van de sessie zelf mislukt, dan valt session_id
      // hier terug op null (nog steeds een geldige, niet-verwijzende
      // waarde) in plaats van de hele feedback-opslag te laten mislukken.
      Promise.resolve(sessionCreatePromise).then(function (sessionRes) {
        if (sessionRes && sessionRes.error) row.session_id = null;
        insertFeedbackRow(row);
      });
    }
    return true;

    function insertFeedbackRow(row) {
      sb.from(TABLE).insert(row).then(function (res) {
        if (!res.error) return;

        if (isMissingSchemaError(res.error)) {
          // Een recentere migratie (sessies/designrichting) is op deze
          // omgeving nog niet uitgevoerd. Dat mag de basisfeedback niet
          // blokkeren: opnieuw proberen zonder de optionele velden, zodat
          // het item alsnog wordt opgeslagen — alleen die extra metadata
          // ontbreekt dan totdat de migratie is gedraaid.
          var fallbackRow = {};
          for (var k in row) if (OPTIONAL_ROW_FIELDS.indexOf(k) === -1) fallbackRow[k] = row[k];
          console.warn(
            "[Feedbackmodus] Kolom(men) " + OPTIONAL_ROW_FIELDS.join("/") + " lijken te ontbreken " +
            "(migratie supabase/schema_v2_sessions.sql en/of schema_v3_theme.sql nog niet uitgevoerd). " +
            "Val terug op opslaan zonder die velden.",
            res.error
          );
          sb.from(TABLE).insert(fallbackRow).then(function (fallbackRes) {
            if (fallbackRes.error) {
              var reason = logSupabaseError("Feedback opslaan (fallback zonder optionele velden)", fallbackRes.error);
              window.alert("Deze feedback kon niet worden opgeslagen: " + reason + ". Probeer het opnieuw.");
              removeFromCache(entry.id);
              if (entry.actionType === "tekst-wijziging") revertLiveText(entry);
              refreshAll();
            }
          });
          return;
        }

        var reason = logSupabaseError("Feedback opslaan", res.error);
        window.alert("Deze feedback kon niet worden opgeslagen: " + reason + ". Probeer het opnieuw.");
        removeFromCache(entry.id);
        // Bij mislukte opslag ook de live tekstwijziging terugdraaien —
        // anders oogt de pagina bijgewerkt terwijl er niets is vastgelegd.
        if (entry.actionType === "tekst-wijziging") revertLiveText(entry);
        refreshAll();
      });
    }
  }
  function updateStatus(id, status) {
    var entry = cache.filter(function (i) { return i.id === id; })[0];
    if (entry) { entry.status = status; entry.updatedAt = new Date().toISOString(); }
    refreshAll();
    if (sb) {
      sb.from(TABLE).update({ status: status, updated_at: new Date().toISOString() }).eq("id", id).then(function (res) {
        if (res.error) {
          var reason = logSupabaseError("Status bijwerken", res.error);
          window.alert("Status bijwerken is niet gelukt: " + reason + ".");
        }
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
        if (res.error) logSupabaseError("Feedback verwijderen", res.error);
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
        if (res.error) {
          var reason = logSupabaseError("Bijwerken", res.error);
          window.alert("Bijwerken is niet gelukt: " + reason + ".");
        }
      });
    }
  }

  function loadInitial() {
    if (!sb) return;
    sb.from(TABLE).select("*").order("created_at", { ascending: false }).then(function (res) {
      if (res.error) { logSupabaseError("Feedback laden", res.error); return; }
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

  /* ---------------- Feedbacksessies + automatische e-mailnotificatie ----------------
     Eén sessie bundelt alle feedback-items vanaf de eerste opmerking tot aan
     de "Ik heb alle feedback gegeven"-knop of 50 minuten inactiviteit. Op
     dat moment stuurt /api/notify-feedback (een Vercel-functie) één keer een
     e-mail naar Jip, met een samenvatting en een kant-en-klare Claude-prompt
     — gebaseerd op wat er in Supabase staat, niet op wat de client beweert. */
  var currentSessionId = null;
  var emailSentThisSession = false;
  var inactivityTimer = null;
  /* Wordt gezet zodra een nieuwe sessie wordt aangemaakt en blijft leven
     tot dat Supabase-verzoek is afgerond. feedback_items.session_id heeft
     een foreign-key-constraint naar feedback_sessions — zonder deze wacht
     zou het EERSTE item van een sessie vrijwel altijd worden geweigerd
     ("violates foreign key constraint ... Key is not present"), omdat de
     sessie-rij dan nog niet bestond op het moment van invoegen. Blijft
     null zodra er niets te wachten valt, zodat andere aanroepen niet
     onnodig vertragen. */
  var sessionCreatePromise = null;
  try {
    currentSessionId = window.sessionStorage.getItem(SESSION_KEY) || null;
    emailSentThisSession = window.sessionStorage.getItem(EMAIL_SENT_KEY) === "1";
  } catch (e) {}

  /* Genereert zo nodig meteen een sessie-id (geen wachttijd voor de
     optimistische UI) en maakt 'm op de achtergrond ook echt aan in
     Supabase, zodat de serverfunctie 'm straks kan terugvinden. */
  function ensureSessionId() {
    if (currentSessionId) return currentSessionId;
    currentSessionId = uid();
    emailSentThisSession = false;
    try {
      window.sessionStorage.setItem(SESSION_KEY, currentSessionId);
      window.sessionStorage.setItem(EMAIL_SENT_KEY, "0");
    } catch (e) {}
    if (sb) {
      sessionCreatePromise = sb.from(SESSIONS_TABLE).insert({ id: currentSessionId, started_at: new Date().toISOString() }).then(function (res) {
        if (res.error) logSupabaseError("Feedbacksessie aanmaken", res.error);
        return res;
      });
    }
    return currentSessionId;
  }

  function endLocalSession() {
    window.clearTimeout(inactivityTimer);
    currentSessionId = null;
    emailSentThisSession = false;
    try {
      window.sessionStorage.removeItem(SESSION_KEY);
      window.sessionStorage.removeItem(EMAIL_SENT_KEY);
    } catch (e) {}
  }

  function armInactivityTimer() {
    window.clearTimeout(inactivityTimer);
    if (emailSentThisSession || !currentSessionId) return;
    inactivityTimer = window.setTimeout(function () { notifyFeedback("inactivity"); }, INACTIVITY_MS);
  }

  /* Stuurt de serverfunctie op pad; markeert daarna (ongeacht het resultaat)
     deze sessie als "al gemeld" zodat er nooit twee keer wordt gemaild. */
  function notifyFeedback(reason) {
    if (!currentSessionId || emailSentThisSession) return;
    emailSentThisSession = true;
    try { window.sessionStorage.setItem(EMAIL_SENT_KEY, "1"); } catch (e) {}
    window.fetch(NOTIFY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: currentSessionId, reason: reason })
    }).then(function (r) {
      if (!r.ok) return r.text().then(function (t) { throw new Error(t); });
      return r.json();
    }).then(function (data) {
      if (data && data.skipped) console.warn("Feedbackmelding overgeslagen:", data.skipped);
      endLocalSession();
    }).catch(function (err) {
      console.error("Feedbackmelding versturen mislukt:", err);
      endLocalSession();
    });
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

  /* ---------------- Feedbackzones automatisch aanmaken ----------------
     OORZAAK van "werkt alleen op de homepage": klikken en hover reageren
     alleen binnen een element met [data-review-id]. Die attributen stonden
     met de hand in index.html (13 zones), maar op geen enkele subpagina —
     daar vingen alleen header en footer (uit de componenten) feedback op.

     Daarom worden zones nu automatisch toegekend, op elke pagina: elke
     sectie in <main>, plus overige losse blokken (kruimelpad, paginakop),
     en het volledige-schermmenu. Handmatig gezette zones blijven leidend.
     Een MutationObserver doet hetzelfde voor later toegevoegde inhoud, zodat
     ook toekomstige pagina's en dynamische content zonder extra werk
     feedback ondersteunen. De id's zijn afgeleid van positie + kop, dus
     stabiel bij elke paginaweergave (nodig om live tekst terug te zetten). */
  var SKIP_ZONE = "script, style, link, noscript, template, .skip-link, [class^='fb-'], [class*=' fb-']";
  var autoZoneCount = 0;

  function slug(s) {
    return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  }
  function zoneLabel(el) {
    var h = el.querySelector("h1, h2, h3");
    var txt = h ? h.textContent.trim() : "";
    if (!txt) { var eb = el.querySelector(".eyebrow"); txt = eb ? eb.textContent.replace(/^[—\s]+/, "").trim() : ""; }
    if (!txt) {
      if (el.matches(".crumb, nav[aria-label='Kruimelpad']")) txt = "Kruimelpad";
      else if (el.matches(".page-hero")) txt = "Paginakop";
      else if (el.matches(".page-cta")) txt = "Afsluitende oproep";
      else if (el.matches("form")) txt = "Formulier";
    }
    if (!txt) txt = "Blok " + (autoZoneCount + 1);
    return txt.replace(/\s+/g, " ").slice(0, 60);
  }
  function tagZone(el) {
    if (el.hasAttribute("data-review-id") || el.matches(SKIP_ZONE)) return;
    if (!el.textContent.trim() && !el.querySelector("img, video, iframe, picture, svg")) return;
    var label = zoneLabel(el);
    autoZoneCount++;
    el.setAttribute("data-review-id", "auto-" + autoZoneCount + "-" + (slug(label) || "blok"));
    el.setAttribute("data-review-label", label);
  }
  /* Loopt de kinderen af: bevat een kind al een zone, dan dieper zoeken
     (zodat een wrapper niet alles in één grote zone opslokt); anders wordt
     het kind zelf een zone. */
  function tagLeftovers(parent) {
    Array.prototype.forEach.call(parent.children, function (child) {
      if (child.matches(SKIP_ZONE) || child.hasAttribute("data-review-id")) return;
      if (child.querySelector("[data-review-id]")) tagLeftovers(child);
      else tagZone(child);
    });
  }
  function autoTagZones() {
    var main = document.querySelector("main") || document.body;
    // 1. Elke buitenste sectie in de hoofdinhoud is een zone.
    main.querySelectorAll("section").forEach(function (s) {
      if (!s.parentElement || !s.parentElement.closest("section, [data-review-id]")) tagZone(s);
    });
    // 2. Overige losse blokken (kruimelpad, intro zonder <section>, …).
    tagLeftovers(main);
    // 3. Het menu staat buiten <header>, dus apart: ook navigatie telt mee.
    var menu = document.querySelector(".overlay-nav");
    if (menu && !menu.hasAttribute("data-review-id")) {
      menu.setAttribute("data-review-id", "menu");
      menu.setAttribute("data-review-label", "Menu");
    }
  }
  var retagTimer = null;
  function scheduleRetag() {
    window.clearTimeout(retagTimer);
    retagTimer = window.setTimeout(autoTagZones, 150);
  }

  /* ---------------- Doel van een klik herkennen ----------------
     Van specifiek naar algemeen: media → knop/kaart/navigatie → tekst →
     contentblok → sectie. Zo is elk onderdeel van een pagina aanklikbaar. */
  var CARD_SEL = "[class*='card'], .tile, .masonry-item, .brand-pill";
  var BLOCK_SEL = "[class*='card'], .spec-item, .step-item, .stat, .faq-item, .hours-row, .item, article, li, form, .map-embed";
  var TEXT_SEL = "h1,h2,h3,h4,h5,h6,p,span,li,blockquote,figcaption,b,strong,em,small,label,dt,dd,td,th,cite,q";

  function directText(el) {
    var t = "";
    el.childNodes.forEach(function (n) { if (n.nodeType === 3) t += n.textContent; });
    return t.trim();
  }
  function describeTarget(el, section) {
    var media = el.closest("img, picture, video, iframe");
    if (media && section.contains(media)) {
      if (media.tagName === "PICTURE") media = media.querySelector("img") || media;
      if (media.tagName === "VIDEO") return { el: media, kind: "video", kindLabel: "Video", detail: media.getAttribute("aria-label") || "" };
      if (media.tagName === "IFRAME") return { el: media.closest(".map-embed") || media, kind: "embed", kindLabel: "Kaart / embed", detail: media.getAttribute("title") || "" };
      return { el: media, kind: "afbeelding", kindLabel: "Afbeelding", detail: media.getAttribute("alt") || "" };
    }
    var btn = el.closest("a,button,[role='button']");
    if (btn && section.contains(btn)) {
      var label = getEditableText(btn).replace(/\s+/g, " ").slice(0, 60) || btn.getAttribute("aria-label") || (btn.querySelector("img") || {}).alt || "";
      // Echte knoppen (CTA's) blijven knoppen, ook in header of footer.
      if (btn.matches(".btn, .btn-text, button")) {
        return { el: btn, kind: "knop", kindLabel: "Knop", detail: label };
      }
      // Links in menu, header, footer en kruimelpad (ook het logo) = navigatie.
      if (btn.closest("nav, .overlay-nav, .site-header, .site-footer, .crumb")) {
        return { el: btn, kind: "navigatie", kindLabel: "Navigatie", detail: label };
      }
      if (btn.matches(CARD_SEL) || btn.querySelector("img, video, h2, h3, h4")) {
        return { el: btn, kind: "kaart", kindLabel: "Kaart", detail: label };
      }
      return { el: btn, kind: "knop", kindLabel: "Knop", detail: label };
    }
    var textEl = el.closest(TEXT_SEL);
    if (!textEl && directText(el)) textEl = el; // bv. <div class="item">Tekst</div>
    if (textEl && section.contains(textEl) && textEl.textContent && textEl.textContent.trim() && !textEl.closest("a,button")) {
      return { el: textEl, kind: "tekst", kindLabel: "Tekst", detail: getEditableText(textEl).slice(0, 60) };
    }
    var block = el.closest(BLOCK_SEL);
    if (block && block !== section && section.contains(block)) {
      var h = block.querySelector("h1,h2,h3,h4,b,strong");
      return { el: block, kind: "blok", kindLabel: "Contentblok", detail: (h ? h.textContent : block.textContent).trim().replace(/\s+/g, " ").slice(0, 60) };
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
    if (lastHoverEl) lastHoverEl.classList.remove("fb-target-hover", "fb-hover-soft");
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
    if (lastHoverEl) lastHoverEl.classList.remove("fb-target-hover", "fb-hover-soft");
    lastHoverEl = t.el;
    lastHoverEl.classList.add("fb-target-hover");
    // Hele secties krijgen een zachtere markering dan losse onderdelen.
    if (t.kind === "sectie") lastHoverEl.classList.add("fb-hover-soft");
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
      sessionId: ensureSessionId(),
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
    var what = target.kind === "video" ? "video" : target.kind === "embed" ? "kaart" : "afbeelding";
    formBody.innerHTML =
      "<h3>Voorstel voor deze " + what + "</h3>" +
      '<p class="fb-target">In <strong>' + (target.section.getAttribute("data-review-label") || "") + "</strong></p>" +
      '<p class="fb-hint-copy">Dit wordt als voorstel opgeslagen — de ' + what + " zelf verandert niet.</p>" +
      '<div class="fb-field"><label for="fb-img-note">Opmerking</label><textarea id="fb-img-note" placeholder="Bijvoorbeeld: gebruik liever een andere foto"></textarea></div>' +
      '<label class="fb-checkbox"><input type="checkbox" id="fb-img-replace"><span>Andere ' + what + " voorstellen</span></label>" +
      attachmentFieldHtml() +
      '<div class="fb-actions"><button type="button" class="fb-btn-ghost" id="fb-cancel">Annuleren</button><button type="button" class="fb-btn-save" id="fb-save">Feedback opslaan</button></div>';
    wireAttachmentField();

    currentSaveHandler = function () {
      var note = document.getElementById("fb-img-note").value.trim();
      var replace = document.getElementById("fb-img-replace").checked;
      if (!note && !replace && !pendingAttachment) { document.getElementById("fb-img-note").focus(); return; }
      var msg = note ? "Voorstel: " + note : "Voorstel: andere " + what + " gewenst";
      var saved = addEntry(baseEntry(target, { actionType: replace ? "afbeelding-vervangen" : "afbeelding-opmerking", message: msg, imageReplace: replace }));
      if (saved) {
        if (replace || pendingAttachment) (target.el.closest(".media") || target.el).classList.add("fb-image-flagged");
        showToast("Voorstel opgeslagen.");
        closePopover();
      }
    };
    window.setTimeout(function () { var f = document.getElementById("fb-img-note"); if (f) f.focus(); }, 150);
  }

  /* Kaarten (klikbare tegels) en contentblokken: één vrije opmerking,
     met optionele bijlage. */
  function renderCommentForm(target) {
    formBody.innerHTML =
      "<h3>Opmerking over dit" + (target.kind === "kaart" ? "e kaart" : " blok") + "</h3>" +
      '<p class="fb-target">In <strong>' + (target.section.getAttribute("data-review-label") || "") + "</strong>" +
        (target.detail ? " · " + target.detail.replace(/</g, "&lt;") : "") + "</p>" +
      '<p class="fb-hint-copy">Dit wordt als voorstel opgeslagen — de pagina verandert niet.</p>' +
      '<div class="fb-field"><label for="fb-comment">Wat wil je aanpassen?</label><textarea id="fb-comment" placeholder="Bijvoorbeeld: andere tekst, foto of volgorde"></textarea></div>' +
      attachmentFieldHtml() +
      '<div class="fb-actions"><button type="button" class="fb-btn-ghost" id="fb-cancel">Annuleren</button><button type="button" class="fb-btn-save" id="fb-save">Feedback opslaan</button></div>';
    wireAttachmentField();

    currentSaveHandler = function () {
      var msg = document.getElementById("fb-comment").value.trim();
      if (!msg && !pendingAttachment) { document.getElementById("fb-comment").focus(); return; }
      var saved = addEntry(baseEntry(target, { actionType: "opmerking", message: "Voorstel: " + (msg || "zie bijlage") }));
      if (saved) { showToast("Voorstel opgeslagen."); closePopover(); }
    };
    window.setTimeout(function () { var f = document.getElementById("fb-comment"); if (f) f.focus(); }, 150);
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
    if (target.kind === "tekst" || target.kind === "knop" || target.kind === "navigatie") renderTextForm(target);
    else if (target.kind === "afbeelding" || target.kind === "video" || target.kind === "embed") renderImageForm(target);
    else if (target.kind === "kaart" || target.kind === "blok") renderCommentForm(target);
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

  /* ---------------- Welkom + ontwerpvragen ----------------
     Verschijnt vanzelf bij de allereerste keer dat iemand feedbackmodus
     inschakelt: legt in drie stappen uit hoe het werkt en vraagt in
     dezelfde stap naar een algemene indruk. Wordt daarna nooit meer
     automatisch afgedwongen, maar blijft altijd bereikbaar via de
     "❓ Hoe werkt dit?"-link in de sidebar (openHowItWorks) — ook als
     iemand de eerste keer op "Overslaan" drukte. */
  var introScrim = document.createElement("div");
  introScrim.className = "fb-scrim fb-intro-scrim";
  document.body.appendChild(introScrim);

  var introMode = "onboarding"; // "onboarding" | "edit"
  var editingGeneralId = null;

  function introHtml(isOnboarding) {
    return (
      '<div class="fb-modal fb-intro-modal" role="dialog" aria-modal="true">' +
        "<h3>" + (isOnboarding ? "Welkom! Zo werkt feedback geven" : "Zo werkt feedback geven") + "</h3>" +
        '<div class="fb-steps">' +
          '<div class="fb-step"><span class="fb-step-num">1</span><p>Klik ergens op de pagina — op een tekst, foto, knop of hele sectie.</p></div>' +
          '<div class="fb-step"><span class="fb-step-num">2</span><p>Typ je opmerking of voorstel en sla ’m op.</p></div>' +
          '<div class="fb-step"><span class="fb-step-num">3</span><p>Bekijk alles terug via “Mijn feedback” rechtsboven. Dit venster kun je daar altijd opnieuw openen.</p></div>' +
        "</div>" +
        '<hr class="fb-divider">' +
        "<h4>Wat vind je van het ontwerp?</h4>" +
        '<p class="fb-hint-copy">Je kunt je antwoord hier altijd weer aanpassen.</p>' +
        '<div class="fb-field"><label for="fb-intro-like">Wat spreekt je aan?</label><textarea id="fb-intro-like" placeholder="Wat vind je nu al goed?"></textarea></div>' +
        '<div class="fb-field"><label for="fb-intro-change">Wat moet er nog worden aangepast?</label><textarea id="fb-intro-change" placeholder="Denk aan: kleuren, lettertypes, foto’s, video’s, teksten, uitstraling, navigatie"></textarea></div>' +
        '<div class="fb-actions"><button type="button" class="fb-btn-ghost" id="fb-intro-skip">' + (isOnboarding ? "Overslaan" : "Sluiten") + "</button>" +
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
            sessionId: ensureSessionId(),
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

  /* Altijd bereikbare ingang naar "Zo werkt feedback geven" + de algemene
     indruk — ook nadat iemand de eerste keer op "Overslaan" heeft gedrukt.
     Bestaat er al een "algemeen"-item, dan open je dat ter bewerking;
     zo niet, dan krijg je gewoon de (lege) eerste-keer-vragen te zien. */
  function openHowItWorks() {
    var existing = readAll().filter(function (i) { return i.actionType === "algemeen"; })[0];
    if (existing) openIntroEdit(existing);
    else openOnboarding();
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
      '<div><h3>Mijn feedback</h3><p>Al je opmerkingen, overzichtelijk bij elkaar.</p>' +
        '<button type="button" class="fb-help-link" id="fb-help-link">❓ Hoe werkt dit? / mijn algemene indruk</button>' +
      "</div>" +
      '<button type="button" class="fb-close" id="fb-sidebar-close" aria-label="Sluiten">✕</button>' +
    "</div>" +
    '<div class="fb-filter-row" id="fb-filter-row">' +
      '<button type="button" data-filter="all" class="is-active">Alles</button>' +
      STATUS.map(function (s) { return '<button type="button" data-filter="' + s.value + '">' + s.label + "</button>"; }).join("") +
    "</div>" +
    '<div class="fb-list" id="fb-list"></div>' +
    '<div class="fb-sidebar-foot">' +
      '<button type="button" class="fb-done-btn" id="fb-done-btn">✅ Ik heb alle feedback gegeven</button>' +
      '<p class="fb-done-hint">Jip krijgt hiervan automatisch een e-mail met een samenvatting.</p>' +
    "</div>";
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
      // Eén centraal overzicht voor de hele site: toon altijd op welke pagina.
      var pageName = (i.pageTitle || "").split(" — ")[0] || i.path || "";
      var pageLine = pageName
        ? '<span class="fb-item-page' + (i.path === window.location.pathname ? " is-current" : "") + '">' +
            (i.path === window.location.pathname ? "Deze pagina" : "Pagina") + ": " + pageName.replace(/</g, "&lt;") + "</span>"
        : "";
      return (
        '<div class="fb-item" data-id="' + i.id + '">' +
          '<div class="fb-item-top">' +
            '<span class="fb-item-kind">' + kindLine + "</span>" +
            '<span class="fb-item-date">' + fmtDate(i.createdAt) + "</span>" +
          "</div>" +
          pageLine +
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
  document.getElementById("fb-help-link").addEventListener("click", openHowItWorks);
  sidebarScrim.addEventListener("click", closeSidebar);
  panelBtn.addEventListener("click", openSidebar);

  /* "✅ Ik heb alle feedback gegeven" — markeert de sessie als afgerond en
     stuurt (via /api/notify-feedback) direct de samenvattings-e-mail naar
     Jip, zonder op de inactiviteitstimer te hoeven wachten. */
  document.getElementById("fb-done-btn").addEventListener("click", function () {
    if (!currentSessionId) { showToast("Je hebt nog geen feedback gegeven."); return; }
    notifyFeedback("manual");
    showToast("Bedankt! Jip is op de hoogte gebracht.");
    closeSidebar();
    setActiveCore(false);
  });

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

  autoTagZones();
  if (window.MutationObserver) {
    new MutationObserver(function (muts) {
      for (var m = 0; m < muts.length; m++) {
        var t = muts[m].target;
        // Wijzigingen binnen de eigen feedback-UI negeren.
        if (t.nodeType === 1 && t.closest && t.closest("[class^='fb-'], [class*=' fb-']")) continue;
        scheduleRetag();
        return;
      }
    }).observe(document.body, { childList: true, subtree: true });
  }

  applyState();
  loadInitial();
  initRealtime();
})();
