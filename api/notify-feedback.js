/* ==========================================================================
   Vercel Serverless Function — /api/notify-feedback

   Wordt door de client (assets/js/modules/feedback-mode.js) aangeroepen op
   twee momenten:
   - de klant klikt "✅ Ik heb alle feedback gegeven"          (reason: "manual")
   - er is 50 minuten geen nieuwe feedback toegevoegd           (reason: "inactivity")

   Doet zelf de hele afhandeling:
   1) haalt de sessie en bijbehorende feedback-items op uit Supabase
      (bron van waarheid voor alle feedbackgegevens — niets komt van de client)
   2) genereert een managementsamenvatting + een kant-en-klare Claude-prompt
      (templated, geen externe AI-aanroep nodig — voorspelbaar en gratis)
   3) verstuurt de e-mail via Resend
   4) markeert de sessie als afgehandeld, zodat 'ie nooit dubbel verstuurt

   Vereist environment variable in Vercel: RESEND_API_KEY (server-only geheim,
   NOOIT in clientcode zetten). Optioneel: RESEND_FROM, SITE_URL.
   ========================================================================== */

var SUPABASE_URL = "https://wxpyvoisvmtrclztgdrk.supabase.co";
var SUPABASE_KEY = "sb_publishable_sfXqpISGr8lwpIeZxWfELg_KVHCi5mX";
var NOTIFY_TO = "jip@boostlab-agency.nl";

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Alleen POST toegestaan." });
    return;
  }

  try {
    var body = req.body || {};
    var sessionId = body.sessionId;
    var reason = body.reason === "manual" ? "manual" : "inactivity";

    if (!sessionId || typeof sessionId !== "string") {
      res.status(400).json({ error: "sessionId ontbreekt." });
      return;
    }

    var resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      console.error("RESEND_API_KEY ontbreekt in de Vercel-omgevingsvariabelen.");
      res.status(500).json({ error: "E-mailverzending is niet geconfigureerd (RESEND_API_KEY ontbreekt)." });
      return;
    }

    var session = await fetchOne(
      "/rest/v1/feedback_sessions?id=eq." + encodeURIComponent(sessionId) + "&select=*"
    );
    if (!session) {
      res.status(404).json({ error: "Sessie niet gevonden." });
      return;
    }
    if (session.email_sent_at) {
      // Al eerder verstuurd voor deze sessie — nooit dubbel mailen.
      res.status(200).json({ ok: true, skipped: "already-sent" });
      return;
    }

    var items = await fetchAll(
      "/rest/v1/feedback_items?session_id=eq." + encodeURIComponent(sessionId) + "&select=*&order=created_at.asc"
    );
    if (!items.length) {
      res.status(200).json({ ok: true, skipped: "no-items" });
      return;
    }

    var built = buildSummary(items);
    var siteUrl = process.env.SITE_URL || deriveSiteUrl(req);
    var reasonLabel = reason === "manual"
      ? "De klant heeft op “Ik heb alle feedback gegeven” geklikt."
      : "Er is 50 minuten geen nieuwe feedback meer toegevoegd.";

    var html =
      '<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:620px;margin:0 auto;color:#20201d;line-height:1.55">' +
        "<h2 style=\"font-weight:600;margin-bottom:4px\">Nieuwe feedback ontvangen van De Vloerenspecialist</h2>" +
        '<p style="color:#55524b;margin-top:0">' + escapeHtml(reasonLabel) + "</p>" +
        '<p><strong>' + items.length + '</strong> nieuw' + (items.length === 1 ? "" : "e") + " feedbackpunt" + (items.length === 1 ? "" : "en") + " in deze sessie.</p>" +
        "<h3>Samenvatting</h3>" +
        built.summaryHtml +
        (built.attachments.length
          ? "<h3>Bijlagen</h3><ul>" + built.attachments.map(function (a) {
              return '<li><a href="' + escapeHtml(a.url) + '">' + escapeHtml(a.name) + "</a></li>";
            }).join("") + "</ul>"
          : "") +
        "<h3>Claude-prompt (klaar om te plakken)</h3>" +
        '<pre style="background:#f4f3f0;border:1px solid #ddd6ca;border-radius:10px;padding:16px;white-space:pre-wrap;font-size:13px;line-height:1.6">' +
          escapeHtml(built.promptText) +
        "</pre>" +
        '<p style="margin-top:28px"><a href="' + escapeHtml(siteUrl) + '" style="display:inline-block;background:#9a5b3b;color:#fffdf9;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600">Open de feedbackomgeving →</a></p>' +
      "</div>";

    var sendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + resendKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || "Feedback De Vloerenspecialist <onboarding@resend.dev>",
        to: [NOTIFY_TO],
        subject: "Nieuwe feedback ontvangen van De Vloerenspecialist",
        html: html
      })
    });

    if (!sendRes.ok) {
      var errText = await sendRes.text();
      console.error("Resend-fout:", sendRes.status, errText);
      res.status(502).json({ error: "E-mail versturen is mislukt.", detail: errText });
      return;
    }

    var patch = { email_sent_at: new Date().toISOString(), item_count: items.length };
    if (reason === "manual") { patch.ended_at = new Date().toISOString(); patch.ended_reason = "manual"; }
    else { patch.ended_at = new Date().toISOString(); patch.ended_reason = "inactivity"; }

    await fetch(SUPABASE_URL + "/rest/v1/feedback_sessions?id=eq." + encodeURIComponent(sessionId), {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: "Bearer " + SUPABASE_KEY,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify(patch)
    });

    res.status(200).json({ ok: true, itemCount: items.length });
  } catch (err) {
    console.error("notify-feedback onverwachte fout:", err);
    res.status(500).json({ error: String((err && err.message) || err) });
  }
};

/* ---------------- Supabase-helpers (REST, dezelfde publishable key als de client) ---------------- */
async function fetchAll(path) {
  var r = await fetch(SUPABASE_URL + path, {
    headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY }
  });
  if (!r.ok) throw new Error("Supabase-fout (" + r.status + "): " + (await r.text()));
  return r.json();
}
async function fetchOne(path) {
  var rows = await fetchAll(path);
  return rows[0] || null;
}

function deriveSiteUrl(req) {
  var host = (req.headers && (req.headers["x-forwarded-host"] || req.headers.host)) || "";
  if (!host) return "https://";
  return "https://" + host + "/index.html";
}

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}
function stripVoorstel(msg) {
  return String(msg || "").replace(/^Voorstel:\s*/i, "");
}

/* ---------------- Samenvatting + Claude-prompt (templated, geen externe AI-call) ---------------- */
var KIND_VERB = {
  "tekst-wijziging": function (i) {
    return 'Pas de tekst in de sectie "' + (i.section_label || i.section_id) + '" aan van "' + i.old_text + '" naar "' + i.new_text + '".';
  },
  "knop-suggestie": function (i) {
    return 'Wijzig de knoptekst in "' + (i.section_label || i.section_id) + '" van "' + i.old_text + '" naar "' + i.new_text + '" (voorstel, nog te beoordelen).';
  },
  "afbeelding-opmerking": function (i) {
    return 'Afbeelding in "' + (i.section_label || i.section_id) + '": ' + stripVoorstel(i.message);
  },
  "afbeelding-vervangen": function (i) {
    return 'Vervang de afbeelding in "' + (i.section_label || i.section_id) + '"' + (i.message ? ": " + stripVoorstel(i.message) : ".");
  },
  "sectie-hoger": function (i) {
    return 'Verplaats de sectie "' + (i.section_label || i.section_id) + '" hoger op de pagina.';
  },
  "sectie-lager": function (i) {
    return 'Verplaats de sectie "' + (i.section_label || i.section_id) + '" lager op de pagina.';
  },
  "sectie-verwijderen": function (i) {
    return 'Overweeg de sectie "' + (i.section_label || i.section_id) + '" te verwijderen.';
  },
  "sectie-aanpassen": function (i) {
    return 'Pas de sectie "' + (i.section_label || i.section_id) + '" aan: ' + stripVoorstel(i.message);
  },
  "algemeen": function (i) {
    return "Algemene indruk: " + i.message;
  }
};

function buildSummary(items) {
  var lines = items.map(function (i, idx) {
    var fn = KIND_VERB[i.action_type];
    var text = fn ? fn(i) : (i.message || i.action_type);
    return (idx + 1) + ". " + text;
  });

  var promptText =
    'Verwerk de volgende klantfeedback op de website "De Vloerenspecialist":\n\n' +
    lines.join("\n") +
    "\n\nGa de punten stap voor stap na, pas ze toe in de code, en meld per punt kort wat je hebt gedaan.";

  var bySection = {};
  items.forEach(function (i) {
    var key = i.section_label || i.section_id || "Algemeen";
    bySection[key] = (bySection[key] || 0) + 1;
  });
  var sectionSummary = Object.keys(bySection).map(function (k) { return k + " (" + bySection[k] + ")"; }).join(", ");

  var summaryHtml =
    "<p>Verdeeld over: " + escapeHtml(sectionSummary) + ".</p>" +
    "<ol>" + lines.map(function (l) { return "<li>" + escapeHtml(l.replace(/^\d+\.\s*/, "")) + "</li>"; }).join("") + "</ol>";

  var attachments = items
    .filter(function (i) { return i.attachment_url; })
    .map(function (i) { return { url: i.attachment_url, name: i.attachment_name || "bijlage" }; });

  return { summaryHtml: summaryHtml, promptText: promptText, attachments: attachments };
}
