<#
  Bouwt de productpagina's (vloersoorten + interieur, behang, raamdecoratie)
  uit één sjabloon. Inhoud staat per pagina in tools/content/<naam>.json;
  dit script schrijft de HTML naar de plek uit het veld "file".
  Gebruik (vanuit de projectmap):  powershell -File tools/build-pages.ps1
  Teksten mogen HTML bevatten (bijv. &amp; of een <a>-link).
#>
param([string]$Root = (Split-Path -Parent $PSScriptRoot))

$utf8 = New-Object Text.UTF8Encoding($false)

$FLOORS = @(
  @{ label = "PVC vloeren"; href = "/vloeren/pvc.html" },
  @{ label = "Houten vloeren"; href = "/vloeren/hout.html" },
  @{ label = "Laminaat"; href = "/vloeren/laminaat.html" },
  @{ label = "Tegelvloeren"; href = "/vloeren/tegelvloer.html" },
  @{ label = "Vloerbedekking"; href = "/vloeren/vloerbedekking.html" },
  @{ label = "Gietvloeren"; href = "/vloeren/gietvloer.html" },
  @{ label = "Hybride houtenvloeren"; href = "/vloeren/hybride-houtenvloer.html" }
)
$INTERIOR = @(
  @{ label = "Interieur op maat"; href = "/interieur/index.html" },
  @{ label = "Behang"; href = "/interieur/behang.html" },
  @{ label = "Raamdecoratie"; href = "/interieur/raamdecoratie.html" },
  @{ label = "Alle vloeren"; href = "/vloeren/index.html" }
)

function Img([string]$src, [int]$w) {
  if ($src -like "*images.unsplash.com*") { return "$src" + "?fm=jpg&amp;q=75&amp;auto=format&amp;fit=crop&amp;w=$w" }
  return $src
}
function Paras($list) { ($list | ForEach-Object { "<p>$_</p>" }) -join "`n          " }

Get-ChildItem (Join-Path $PSScriptRoot "content\*.json") | ForEach-Object {
  $file = $_
  $d =Get-Content $file.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
  $out = Join-Path $Root $d.file
  $isFloor = $d.group -eq "vloeren"

  # Kruimelpad
  $crumb = '<a href="/index.html">Home</a><span class="sep">/</span>'
  if ($isFloor) { $crumb += '<a href="/vloeren/index.html">Vloeren</a><span class="sep">/</span>' }
  $crumb += "<span aria-current=""page"">$($d.name)</span>"

  # Soorten
  $n = 0
  $types = ($d.types.items | ForEach-Object {
    $n++
    $id = if ($_.id) { " id=""$($_.id)""" } else { "" }
    $img = if ($_.img) { "<img src=""$(Img $_.img 900)"" alt=""$($_.alt)"" loading=""lazy"">" } else { "" }
    $tags = if ($_.tags) { '<div class="tag-row">' + (($_.tags | ForEach-Object { "<span class=""tag"">$_</span>" }) -join "") + '</div>' } else { "" }
    @"
        <article class="pr-type"$id>
          <span class="pr-type-nr">$('{0:00}' -f $n)</span>
          $img
          <h3>$($_.title)</h3>
          <p>$($_.text)</p>
          $tags
        </article>
"@
  }) -join "`n"
  $cols = [Math]::Min($d.types.items.Count, 4)
  if ($d.types.items.Count -eq 5) { $cols = 5 }

  # Voordelen
  $benefits = ($d.benefits.items | ForEach-Object {
    "        <div class=""pr-benefit""><h3>$($_.title)</h3><p>$($_.text)</p></div>"
  }) -join "`n"

  # Meer weten
  $info = ($d.info.rows | ForEach-Object {
    $id = if ($_.id) { " id=""$($_.id)""" } else { "" }
    @"
        <div class="pr-info-row"$id>
          <h3>$($_.title)</h3>
          <div>
          $(Paras $_.paras)
          </div>
        </div>
"@
  }) -join "`n"

  # Merken (optioneel)
  $brands = ""
  if ($d.brands -and $d.brands.items.Count -gt 0) {
    $pills = ($d.brands.items | ForEach-Object { "<a class=""pr-brand"" href=""$($_.href)"">$($_.label)</a>" }) -join "`n        "
    $brands = @"

  <!-- 7 · Merken -->
  <section class="pr-section" data-review-id="merken" data-review-label="Merken">
    <div class="wrap">
      <div class="pr-head">
        <div>
          <h2>$($d.brands.h2)</h2>
          <p class="eyebrow">Merken</p>
        </div>
        <p class="pr-head-text">$($d.brands.text)</p>
      </div>
      <div class="pr-brands">
        $pills
      </div>
    </div>
  </section>
"@
  }

  # Verder kijken
  $relSet = if ($isFloor) { $FLOORS } else { $INTERIOR }
  $related = ($relSet | Where-Object { $_.href -ne "/$($d.file)" } | ForEach-Object {
    "        <a href=""$($_.href)"">$($_.label) <span aria-hidden=""true"">&rarr;</span></a>"
  }) -join "`n"
  $relTitle = if ($isFloor) { "Bekijk ook de andere vloersoorten" } else { "Bekijk ook" }

  $html = @"
<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>$($d.title) — De Vloerenspecialist Tilburg</title>
<meta name="description" content="$($d.metaDesc)">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%23e20e18'/%3E%3Ctext x='32' y='43' font-family='Georgia,serif' font-size='30' fill='%23fffdf9' text-anchor='middle'%3EV%3C/text%3E%3C/svg%3E">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://images.unsplash.com">
<link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@1,500;1,600&family=Work+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">

<link rel="stylesheet" href="/assets/css/tokens.css">
<link rel="stylesheet" href="/assets/css/base.css">
<link rel="stylesheet" href="/assets/css/header.css">
<link rel="stylesheet" href="/assets/css/footer.css">
<link rel="stylesheet" href="/assets/css/review-mode.css">
<link rel="stylesheet" href="/assets/css/feedback-mode.css">
<link rel="stylesheet" href="/assets/css/page.css">
<link rel="stylesheet" href="/assets/css/product.css">

<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js" defer></script>

<script src="/assets/js/components/header.js" defer></script>
<script src="/assets/js/components/footer.js" defer></script>
<script src="/assets/js/modules/wishlist.js" defer></script>
<script src="/assets/js/modules/review-mode.js" defer></script>
<script src="/assets/js/modules/feedback-mode.js" defer></script>
<script src="/assets/js/modules/nav.js" defer></script>
<script src="/assets/js/modules/open-status.js" defer></script>
<link rel="stylesheet" href="/assets/css/design-b.css">
<script src="/assets/js/modules/design-switch.js"></script>
</head>
<body data-page="sub">
<!-- Gegenereerd door tools/build-pages.ps1 uit tools/content/$($file.Name) — pas de inhoud daar aan. -->

<a class="skip-link" href="#main">Naar de inhoud</a>
<div id="site-header"></div>

<main id="main">

  <!-- 1 · Hero: kop en intro, daaronder een grote foto op een beige vlak -->
  <section class="pr-hero" data-review-id="hero" data-review-label="Hero">
    <div class="pr-hero-panel" aria-hidden="true"></div>
    <div class="wrap pr-hero-inner">
      <nav class="crumb" aria-label="Kruimelpad">$crumb</nav>
      <div class="pr-hero-head">
        <div>
          <p class="eyebrow">$($d.eyebrow)</p>
          <h1>$($d.h1)</h1>
        </div>
        <div>
          <p class="pr-hero-lead">$($d.lead)</p>
          <div class="pr-hero-actions">
            <a class="btn btn-primary" href="/showroom.html">Plan uw showroombezoek</a>
            <a class="btn-text" href="/contact.html">Vraag advies aan <span class="arrow">&rarr;</span></a>
          </div>
        </div>
      </div>
      <p class="pr-hero-vertical" aria-hidden="true">$($d.vertical) <strong>in Tilburg</strong></p>
      <div class="pr-hero-media">
        <img src="$(Img $d.heroImg 2000)" alt="$($d.heroAlt)" loading="eager">
      </div>
    </div>
  </section>

  <!-- 2 · Over -->
  <section class="pr-section" data-review-id="over" data-review-label="Over $($d.name)">
    <div class="wrap pr-about-grid">
      <div>
        <h2>$($d.about.h2)</h2>
        <p class="eyebrow">$($d.about.eyebrow)</p>
      </div>
      <div class="pr-about-text">
          $(Paras $d.about.paras)
      </div>
    </div>
  </section>

  <!-- 3 · Soorten -->
  <section class="pr-section" data-review-id="soorten" data-review-label="Soorten">
    <div class="wrap">
      <div class="pr-head">
        <div>
          <h2>$($d.types.h2)</h2>
          <p class="eyebrow">$($d.types.eyebrow)</p>
        </div>
        <p class="pr-head-text">$($d.types.text)</p>
      </div>
      <div class="pr-types" style="--cols: $cols">
$types
      </div>
    </div>
  </section>

  <!-- 4 · Uitgelicht: grote foto op een beige vlak -->
  <section class="pr-feature" data-review-id="uitgelicht" data-review-label="Uitgelicht">
    <div class="wrap pr-feature-grid">
      <div class="pr-feature-media">
        <img src="$(Img $d.feature.img 1600)" alt="$($d.feature.alt)" loading="lazy">
      </div>
      <div class="pr-feature-copy">
        <p class="eyebrow">$($d.feature.eyebrow)</p>
        <h2>$($d.feature.h2)</h2>
        <p>$($d.feature.text)</p>
        <a class="btn btn-outline" href="/showroom.html">Plan uw showroombezoek</a>
      </div>
    </div>
  </section>

  <!-- 5 · Voordelen -->
  <section class="pr-section" data-review-id="voordelen" data-review-label="Voordelen">
    <div class="wrap">
      <div class="pr-head">
        <div>
          <h2>$($d.benefits.h2)</h2>
          <p class="eyebrow">Voordelen</p>
        </div>
      </div>
      <div class="pr-benefits">
$benefits
      </div>
    </div>
  </section>

  <!-- 6 · Meer weten -->
  <section class="pr-section" data-review-id="meer-weten" data-review-label="Meer weten">
    <div class="wrap">
      <div class="pr-head">
        <div>
          <h2>$($d.info.h2)</h2>
          <p class="eyebrow">Goed om te weten</p>
        </div>
      </div>
      <div class="pr-info">
$info
      </div>
    </div>
  </section>
$brands

  <!-- 8 · Kom langs -->
  <section class="pr-cta" data-review-id="kom-langs" data-review-label="Kom langs">
    <div class="wrap pr-cta-grid">
      <div class="pr-cta-copy">
        <span class="open-pill" data-open-status></span>
        <h2>$($d.cta.h2)</h2>
        <p>$($d.cta.text)</p>
        <p class="pr-cta-address">Jules Verneweg 7a, 5015 BD Tilburg &middot; Gratis parkeren</p>
        <div class="pr-hero-actions">
          <a class="btn btn-primary" href="/showroom.html">Plan uw showroombezoek</a>
          <a class="btn-text" href="https://www.google.com/maps/dir/?api=1&amp;destination=Jules+Verneweg+7a,+5015+BD+Tilburg" target="_blank" rel="noopener">Route plannen <span class="arrow">&rarr;</span></a>
        </div>
      </div>
      <div class="pr-cta-media">
        <img src="$(Img $d.cta.img 1400)" alt="$($d.cta.alt)" loading="lazy">
      </div>
    </div>
  </section>

  <!-- 9 · Verder kijken -->
  <section class="pr-section is-surface" data-review-id="verder-kijken" data-review-label="Verder kijken">
    <div class="wrap">
      <div class="pr-head">
        <div>
          <h2>$relTitle</h2>
        </div>
      </div>
      <nav class="pr-related" aria-label="$relTitle">
$related
      </nav>
    </div>
  </section>
</main>

<div id="site-footer"></div>
</body>
</html>
"@
  [IO.File]::WriteAllText($out, $html, $utf8)
  Write-Output "geschreven: $($d.file)"
}
