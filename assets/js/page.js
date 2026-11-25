/* ==========================================================================
   Subpagina-gedrag — gedeeld door alle interne pagina's (niet de homepage,
   die heeft zijn eigen home.js). Lichtgewicht met opzet: geen GSAP-afhan-
   kelijkheid nodig voor een simpele fade-in, dus IntersectionObserver.
   ========================================================================== */
(function () {
  "use strict";
  if (document.body.getAttribute("data-page") !== "sub") return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) document.documentElement.classList.add("reduced-motion");

  /* Rustige fade + optilling zodra een blok in beeld komt — dezelfde
     visuele taal als de homepage, maar zonder scroll-storytelling. */
  function initReveals() {
    var els = document.querySelectorAll(".reveal");
    if (!els.length) return;
    if (reduceMotion || typeof IntersectionObserver === "undefined") {
      els.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    els.forEach(function (el) { io.observe(el); });
  }

  /* Zachte cascade in grids: elk kind onthult een fractie later. */
  function initGridStagger() {
    document.querySelectorAll(".spec-grid, .variant-grid, .texture-strip, .step-row").forEach(function (grid) {
      var items = grid.querySelectorAll(":scope > .reveal");
      items.forEach(function (el, i) { el.style.transitionDelay = Math.min(i * 0.08, 0.4) + "s"; });
    });
  }

  /* Magnetische knoppen — zelfde gevoel als de homepage, maar zonder GSAP:
     subpagina's laden die library niet, dus een lichte rAF-tween volstaat
     voor dit ene effect. Houdt de knoppen-ervaring overal identiek. */
  function initMagnetic() {
    if (reduceMotion || !window.matchMedia("(pointer: fine)").matches) return;
    document.querySelectorAll(".magnetic").forEach(function (el) {
      var x = 0, y = 0, tx = 0, ty = 0, raf = null;
      function tick() {
        x += (tx - x) * .18; y += (ty - y) * .18;
        el.style.transform = "translate(" + x.toFixed(2) + "px," + y.toFixed(2) + "px)";
        if (Math.abs(tx - x) > .1 || Math.abs(ty - y) > .1) { raf = requestAnimationFrame(tick); }
        else { raf = null; }
      }
      function kick() { if (!raf) raf = requestAnimationFrame(tick); }
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        tx = (e.clientX - r.left - r.width / 2) * .35;
        ty = (e.clientY - r.top - r.height / 2) * .35;
        kick();
      });
      el.addEventListener("mouseleave", function () { tx = 0; ty = 0; kick(); });
    });
  }

  /* FAQ-accordeon (Contactpagina) — één open tegelijk, met toetsenbord- en
     screenreader-ondersteuning via aria-expanded. */
  function initFaq() {
    document.querySelectorAll(".faq-item").forEach(function (item) {
      var btn = item.querySelector(".faq-q");
      if (!btn) return;
      btn.addEventListener("click", function () {
        var wasOpen = item.classList.contains("is-open");
        item.closest(".faq-list").querySelectorAll(".faq-item.is-open").forEach(function (other) {
          other.classList.remove("is-open");
          other.querySelector(".faq-q").setAttribute("aria-expanded", "false");
        });
        if (!wasOpen) {
          item.classList.add("is-open");
          btn.setAttribute("aria-expanded", "true");
        }
      });
    });
  }

  /* Contact- en afsprakenformulier: versturen naar /api/aanvraag (Vercel +
     Resend). Lukt dat niet, dan tonen we telefoon en mail als terugval. */
  function initContactForm() {
    // Contact- en afsprakenformulier: versturen via /api/aanvraag (Resend).
    var forms = [document.getElementById("contact-form"), document.getElementById("appt-form")].filter(Boolean);
    forms.forEach(initAanvraagForm);
  }

  function initAanvraagForm(form) {
    var soort = form.getAttribute("data-aanvraag") || "contact";
    var note = form.querySelector(".form-note") || document.getElementById("contact-form-note");
    var dateInput = form.querySelector('input[name="datum"]');
    var hint = form.querySelector(".appt-hint");
    var middag = form.querySelector("[data-middag]");

    if (dateInput) {
      // Vroegst morgen, uiterlijk drie maanden vooruit (lokale datum).
      var iso = function (d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); };
      var t = new Date(); t.setDate(t.getDate() + 1);
      if (t.getDay() === 0) t.setDate(t.getDate() + 1);
      var max = new Date(); max.setMonth(max.getMonth() + 3);
      dateInput.min = iso(t); dateInput.max = iso(max);
      dateInput.addEventListener("change", function () { checkDate(); });
    }

    // Onderwerp vooraf aanvinken vanuit de link (?onderwerp=Vloeren) of de vorige pagina.
    var pre = new URLSearchParams(location.search).get("onderwerp");
    if (!pre && document.referrer.indexOf(location.origin) === 0) {
      var ref = document.referrer.replace(location.origin, "");
      if (/traprenovatie/.test(ref)) pre = "Traprenovatie";
      else if (/^\/vloeren\//.test(ref)) pre = "Vloeren";
      else if (/behang|renostuc/.test(ref)) pre = "Behang";
      else if (/gordijn|jaloezie|raamdecoratie/.test(ref)) pre = "Raamdecoratie";
      else if (/^\/interieur\//.test(ref)) pre = "Interieur op maat";
    }
    if (pre) {
      form.querySelectorAll('input[name="onderwerp"]').forEach(function (c) { if (c.value.toLowerCase() === pre.toLowerCase()) c.checked = true; });
    }

    function checkDate() {
      if (!dateInput || !dateInput.value) return !dateInput;
      var d = new Date(dateInput.value + "T12:00:00");
      var ok = d.getDay() !== 0 && (!dateInput.min || dateInput.value >= dateInput.min) && (!dateInput.max || dateInput.value <= dateInput.max);
      dateInput.setAttribute("aria-invalid", ok ? "false" : "true");
      if (hint) {
        hint.textContent = ok ? (d.getDay() === 6 ? "Zaterdag zijn we open tot 15.00 uur" : "Maandag t/m zaterdag") : "Kies een dag van maandag t/m zaterdag, vanaf morgen.";
        hint.classList.toggle("is-error", !ok);
      }
      if (middag) middag.innerHTML = d.getDay() === 6 ? "12 &ndash; 15 uur" : "12 &ndash; 17 uur";
      return ok;
    }

    function show(msg, isError) {
      if (!note) return;
      note.textContent = msg;
      note.hidden = false;
      note.classList.toggle("is-error", !!isError);
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity() || !checkDate()) {
        form.reportValidity();
        if (dateInput && !checkDate()) dateInput.focus();
        return;
      }
      var fd = new FormData(form);
      var data = { soort: soort, onderwerp: fd.getAll("onderwerp") };
      fd.forEach(function (v, k) { if (k !== "onderwerp") data[k] = v; });
      if (soort === "contact") {
        data.naam = fd.get("name"); data.telefoon = fd.get("phone"); data.bericht = fd.get("message");
        data.onderwerp = [fd.get("type")];
      }
      var btn = form.querySelector('button[type="submit"]');
      var label = btn ? btn.textContent : "";
      if (btn) { btn.disabled = true; btn.textContent = "Bezig met versturen..."; }
      fetch("/api/aanvraag", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (!res.ok) throw new Error(res.j.error || "fout");
          var done = document.createElement("div");
          done.className = "form-done";
          done.setAttribute("role", "status");
          done.innerHTML = soort === "afspraak"
            ? "<h2>Bedankt, uw aanvraag is binnen</h2><p>We bellen of mailen u binnen één werkdag om de afspraak te bevestigen. Tot ziens in de showroom aan de Jules Verneweg 7a.</p>"
            : "<h2>Bedankt voor uw bericht</h2><p>We reageren binnen één werkdag. Heeft u haast? Bel 013 - 536 85 98.</p>";
          form.classList.add("is-sent");
          form.parentNode.insertBefore(done, form.nextSibling);
          done.scrollIntoView({ behavior: "smooth", block: "center" });
        })
        .catch(function () {
          show("Versturen lukte helaas niet. Bel ons op 013 - 536 85 98 of mail naar info@vloerenspecialist-tilburg.nl, dan plannen we het direct in.", true);
          if (btn) { btn.disabled = false; btn.textContent = label; }
        });
    });
  }

  /* Scrollspy voor een vaste inhoudsindex ([data-scrollspy] met #-links):
     markeert het onderdeel dat nu in beeld is (Behang-stalenboek). */
  function initScrollspy() {
    document.querySelectorAll("[data-scrollspy]").forEach(function (nav) {
      var links = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
      var targets = links.map(function (a) { return document.querySelector(a.getAttribute("href")); });
      if (typeof IntersectionObserver === "undefined") return;
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var i = targets.indexOf(entry.target);
          links.forEach(function (a, j) { a.classList.toggle("is-active", j === i); });
        });
      }, { rootMargin: "-45% 0px -50% 0px" });
      targets.forEach(function (t) { if (t) io.observe(t); });
    });
  }

  /* Lichtregelaar (Raamdecoratie-hero): een schuifje dat de lamellen over
     de foto open en dicht laat gaan — "speel met het licht". */
  function initLightSlider() {
    document.querySelectorAll("[data-light-slider]").forEach(function (wrap) {
      var input = wrap.querySelector("input[type=range]");
      var label = wrap.querySelector("[data-light-label]");
      if (!input) return;
      function apply() {
        var v = Number(input.value); // 0 = dicht, 100 = open
        wrap.style.setProperty("--slat-open", (v / 100).toFixed(2));
        if (label) label.textContent = v < 25 ? "Privé & gedimd" : v < 70 ? "Zacht gefilterd licht" : "Volop daglicht";
      }
      input.addEventListener("input", apply);
      apply();
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initGridStagger();
    initReveals();
    // initMagnetic() bewust uit: rustig ontwerp zonder bewegende knoppen.
    initFaq();
    initContactForm();
    initScrollspy();
    initLightSlider();
  });
})();
