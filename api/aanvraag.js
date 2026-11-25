/* ==========================================================================
   Vercel Serverless Function — /api/aanvraag

   Ontvangt het afsprakenformulier (/afspraak.html) en het contactformulier
   (/contact.html) en stuurt de aanvraag per e-mail via Resend.

   Environment variables in Vercel:
   - RESEND_API_KEY  (verplicht, server-only geheim; dezelfde als voor
                      /api/notify-feedback)
   - AANVRAAG_TO     (optioneel) ontvanger(s), komma-gescheiden. Zolang de
                      site in preview staat gaat alles naar Boost Lab; bij
                      livegang hier info@vloerenspecialist-tilburg.nl zetten.
   - RESEND_FROM     (optioneel) afzender, bv. "Website <website@vloerenspecialist-tilburg.nl>"
   ========================================================================== */

var DEFAULT_TO = "jip@boostlab-agency.nl";
var ONDERWERPEN = ["Vloeren", "Traprenovatie", "Interieur op maat", "Behang", "Raamdecoratie", "Anders"];
var DAGDELEN = { ochtend: "Ochtend", middag: "Middag" };

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Alleen POST toegestaan." });
    return;
  }

  try {
    var b = req.body || {};
    if (typeof b === "string") { try { b = JSON.parse(b); } catch (e) { b = {}; } }

    // Honeypot: echte bezoekers zien dit veld niet.
    if (b.website) { res.status(200).json({ ok: true }); return; }

    var soort = b.soort === "afspraak" ? "afspraak" : "contact";
    var naam = clean(b.naam, 120);
    var email = clean(b.email, 160);
    var telefoon = clean(b.telefoon, 40);
    var bericht = clean(b.bericht, 4000);

    var errors = [];
    if (!naam) errors.push("naam");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("e-mailadres");

    var onderwerpen = (Array.isArray(b.onderwerp) ? b.onderwerp : [b.onderwerp])
      .map(function (o) { return clean(o, 40); })
      .filter(function (o) { return ONDERWERPEN.indexOf(o) !== -1; });

    var datum = "", dagdeel = "";
    if (soort === "afspraak") {
      if (!telefoon) errors.push("telefoonnummer");
      datum = clean(b.datum, 10);
      dagdeel = DAGDELEN[b.dagdeel] || "";
      var d = /^\d{4}-\d{2}-\d{2}$/.test(datum) ? new Date(datum + "T12:00:00Z") : null;
      if (!d || isNaN(d) || d.getUTCDay() === 0) errors.push("dag");
      if (!dagdeel) errors.push("dagdeel");
    } else if (!bericht) {
      errors.push("bericht");
    }
    if (errors.length) {
      res.status(400).json({ error: "Controleer: " + errors.join(", ") + "." });
      return;
    }

    var resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      console.error("RESEND_API_KEY ontbreekt in de Vercel-omgevingsvariabelen.");
      res.status(500).json({ error: "E-mailverzending is niet geconfigureerd." });
      return;
    }

    var datumNL = datum ? new Date(datum + "T12:00:00Z").toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "";
    var rows = [
      ["Naam", naam],
      ["Telefoon", telefoon || "—"],
      ["E-mail", email],
      ["Onderwerp", onderwerpen.length ? onderwerpen.join(", ") : "—"]
    ];
    if (soort === "afspraak") rows.push(["Voorkeur", datumNL + ", " + dagdeel.toLowerCase()]);
    rows.push([soort === "afspraak" ? "Opmerking" : "Bericht", bericht || "—"]);

    var titel = soort === "afspraak" ? "Nieuwe afspraakaanvraag voor de showroom" : "Nieuw bericht via het contactformulier";
    var html =
      '<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:620px;margin:0 auto;color:#272521;line-height:1.55">' +
        '<h2 style="font-weight:600;margin:0 0 6px">' + escapeHtml(titel) + "</h2>" +
        '<p style="color:#6b655d;margin:0 0 20px">Via de website van De Vloerenspecialist. Beantwoorden gaat direct naar de klant.</p>' +
        '<table style="border-collapse:collapse;width:100%">' +
          rows.map(function (r) {
            return '<tr><td style="padding:9px 12px 9px 0;border-top:1px solid #e7e2da;color:#6b655d;vertical-align:top;white-space:nowrap">' + escapeHtml(r[0]) +
              '</td><td style="padding:9px 0;border-top:1px solid #e7e2da;white-space:pre-wrap">' + escapeHtml(r[1]) + "</td></tr>";
          }).join("") +
        "</table>" +
        (soort === "afspraak" ? '<p style="margin-top:20px;color:#6b655d">Bevestig de afspraak telefonisch of per e-mail; de klant verwacht binnen één werkdag reactie.</p>' : "") +
      "</div>";

    var to = (process.env.AANVRAAG_TO || DEFAULT_TO).split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    var sendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + resendKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || "Website De Vloerenspecialist <onboarding@resend.dev>",
        to: to,
        reply_to: email,
        subject: (soort === "afspraak" ? "Afspraak showroom: " : "Contact: ") + naam + (datumNL ? " (" + datumNL + ", " + dagdeel.toLowerCase() + ")" : ""),
        html: html
      })
    });
    if (!sendRes.ok) {
      console.error("Resend-fout", sendRes.status, await sendRes.text());
      res.status(502).json({ error: "Versturen is niet gelukt." });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Er ging iets mis." });
  }
};

function clean(v, max) {
  return String(v == null ? "" : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
}

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}
