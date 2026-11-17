<#
  Bouwt de productpagina's (vloersoorten + interieur, behang, raamdecoratie)
  uit een sjabloon. Inhoud staat per pagina in tools/content/<naam>.json;
  dit script schrijft de HTML naar de plek uit het veld "file".
  Gebruik (vanuit de projectmap):
    powershell -NoProfile -ExecutionPolicy Bypass -File tools/build-pages.ps1
  Teksten mogen HTML bevatten (bijv. &amp; of een <a>-link).

  Indeling (nov. 2026, naar knulst.nl): beeld voorop, tekst kort zichtbaar
  en de rest achter "Lees meer" / uitklapvragen. Elke pagina krijgt foto's
  uit een beeldenpool per onderwerp (zie $POOLS); met "gallery": [..] in de
  JSON kun je eigen foto's voorrang geven.
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
# Onderdelen van Interieur op maat (group "maatwerk"), elk een eigen pagina.
$MAATWERK = @(
  @{ label = "Kasten op maat"; href = "/interieur/kasten-op-maat.html" },
  @{ label = "Deuren en wanden op maat"; href = "/interieur/deuren-en-wanden-op-maat.html" },
  @{ label = "Meubels op maat"; href = "/interieur/meubels-op-maat.html" },
  @{ label = "Alles over interieur op maat"; href = "/interieur/index.html" }
)

# Beeldenpools per onderwerp: hieruit vullen we de foto's die een pagina zelf
# niet heeft (intro, voordelen, inspiratie, vragen).
$U = "https://images.unsplash.com/photo-"
$R = "/assets/img/real/"
$POOLS = @{
  vloeren = @(
    "$($R)visgraat-detail-1400.jpg", "$($U)1724931498964-a1f392ba9ace", "$($R)visgraat-kastenwand-1800.jpg",
    "$($U)1772797583328-f83bc3f94f80", "$($U)1787145879056-d02365c5b911", "$($U)1649083048381-520a5b3d91ff",
    "$($U)1716315325541-776e39f9725f", "$($U)1584622781564-1d987f7333c1", "$($U)1560184897-1ee3713708ee",
    "$($U)1708540084677-dc5838b37627", "$($U)1783125126583-9aba58ccb0ef", "$($U)1765728614529-4749706523d9",
    "$($U)1684928364941-2158e071cdd6", "$($R)tapijt-pouf-1-1800.jpg"
  )
  behang = @(
    "$($R)behang-woonkamer-1800.jpg", "$($R)maatwerk-meubel-1400.jpg", "$($R)renostuc-bedroom-sage-1600.jpg",
    "$($U)1759774313806-7c564f3bd592", "$($R)renostuc-paneelwand-1800.jpg", "$($U)1783403716758-27e30a7976ca",
    "$($R)renostuc-bedroom-brown-1600.jpg", "$($U)1695624794480-7449b7e5a0b4", "$($R)meubels-op-maat-1600.jpg"
  )
  raam = @(
    "$($R)gordijn-linnen-stoel-1800.jpg", "$($R)mv-dawn-1400.jpg", "$($R)gordijn-caramel-tapijt-1800.jpg",
    "$($R)gordijn-wit-sculptuur-1800.jpg", "$($R)raamdecoratie-woonkamer-1800.jpg",
    "$($R)gordijn-sheer-tapijt-blauw-1800.jpg", "$($R)mv-rose-1400.jpg", "$($R)gordijn-linnen-blauw-tapijt-1800.jpg",
    "$($U)1609534117141-ff9f20450902", "$($U)1776261293170-66fd3b09273e", "$($U)1596275617740-a2ea3bf3aca9",
    "$($U)1779078652928-6d941878d32e", "$($R)gordijn-velvet-zwart-1800.jpg"
  )
  maatwerk = @(
    "$($R)kasten-garderobe-1800.jpg", "$($R)maatwerk-meubel-1400.jpg", "$($R)visgraat-kastenwand-1800.jpg",
    "$($U)1717429541792-5c59021d6ceb", "$($R)meubels-op-maat-1600.jpg", "$($U)1721742151032-e0c159fe5097",
    "$($R)renostuc-paneelwand-1800.jpg", "$($R)behang-woonkamer-1800.jpg", "$($R)visgraat-detail-1400.jpg"
  )
}

# Reacties van klanten (dezelfde als op de homepage).
$QUOTES = @(
  @{ q = "Van eerste advies tot plaatsing &mdash; alles klopte. De showroom gaf meteen een goed gevoel en het eindresultaat overtreft onze verwachtingen."; who = "Marieke Jansen" },
  @{ q = "Professioneel, deskundig en ontzettend netjes opgeleverd. Onze eiken visgraatvloer is precies zoals we 'm in de showroom hadden uitgezocht."; who = "Robin de Groot" },
  @{ q = "Eindelijk een zaak die vloer, raamdecoratie &eacute;n interieur in &eacute;&eacute;n keer goed regelt. Persoonlijk advies zonder verkooppraatjes."; who = "Sanne Bakker" }
)

$CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'

function Img([string]$src, [int]$w) {
  if ($src -like "*images.unsplash.com*") { return "$src" + "?fm=jpg&amp;q=75&amp;auto=format&amp;fit=crop&amp;w=$w" }
  if ($w -le 900) {
    if ($src -like "*-1800.jpg") { return $src -replace "-1800\.jpg$", "-900.jpg" }
    if ($src -like "*-1400.jpg") { return $src -replace "-1400\.jpg$", "-600.jpg" }
  }
  return $src
}
function Key([string]$src) { return ($src -replace "\?.*$", "" -replace "-(600|900|1400|1600|1800)\.jpg$", "" -replace "visgraat-detail", "visgraat-keuken" -replace "tapijt-pouf-2", "tapijt-pouf-1") }
function Paras($list) { ($list | ForEach-Object { "<p>$_</p>" }) -join "`n          " }

# Eerst alle pagina's lezen: hun hoofdfoto gebruiken we voor de "Bekijk ook"-tegels.
$HERO = @{}
Get-ChildItem (Join-Path $PSScriptRoot "content\*.json") | ForEach-Object {
  $j = Get-Content $_.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
  $HERO["/$($j.file)"] = $j.heroImg
}
$HERO["/vloeren/index.html"] = "$($U)1724931498964-a1f392ba9ace"

Get-ChildItem (Join-Path $PSScriptRoot "content\*.json") | ForEach-Object {
  $file = $_
  $d = Get-Content $file.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
  $inheritFrom = $d.inherit
  # Subpagina's kunnen gedeelde blokken (voordelen, tips, merken, kom-langs,
  # uitgelicht) overnemen van hun hoofdpagina: "inherit": "behang.json".
  if ($d.inherit) {
    $p = Get-Content (Join-Path $PSScriptRoot "content\$($d.inherit)") -Raw -Encoding UTF8 | ConvertFrom-Json
    foreach ($k in @("feature", "benefits", "info", "brands", "cta")) {
      if (-not $d.$k -and $p.$k) { $d | Add-Member -NotePropertyName $k -NotePropertyValue $p.$k }
    }
  }
  $out = Join-Path $Root $d.file
  $isFloor = $d.group -eq "vloeren"
  $isMaatwerk = $d.group -eq "maatwerk"

  # ---- Beeld voor deze pagina: eigen foto's eerst, dan de pool ----
  $poolName = "maatwerk"
  if ($isFloor) { $poolName = "vloeren" }
  elseif ($d.file -match "behang|renostuc" -or $inheritFrom -eq "behang.json") { $poolName = "behang" }
  elseif ($d.file -match "raamdecoratie|gordijn|jaloezie" -or $inheritFrom -eq "raamdecoratie.json") { $poolName = "raam" }
  $used = @{}
  foreach ($s in @($d.heroImg, $d.feature.img, $d.cta.img)) { if ($s) { $used[(Key $s)] = 1 } }
  $cands = @()
  if ($d.gallery) { $cands += $d.gallery }
  if ($d.types) { $d.types.items | Where-Object { $_.img } | ForEach-Object { $used[(Key $_.img)] = 1 } }
  $cands += $POOLS[$poolName]
  # Interieurpaginas lenen bij elkaar als hun eigen pool op is.
  $BORROW = @{ behang = @("maatwerk", "raam"); raam = @("maatwerk", "behang"); maatwerk = @("behang", "raam") }
  if (-not $isFloor) { foreach ($pn in $BORROW[$poolName]) { $cands += $POOLS[$pn] } }
  $queue = New-Object System.Collections.ArrayList
  foreach ($c in $cands) { $k = Key $c; if (-not $used.ContainsKey($k)) { $used[$k] = 1; [void]$queue.Add($c) } }
  $script:qi = 0
  function NextImg { if ($queue.Count -eq 0) { return $d.heroImg }; $v = $queue[$script:qi % $queue.Count]; $script:qi++; return $v }
  $alt = $d.heroAlt

  # Kruimelpad
  $crumb = '<a href="/index.html">Home</a><span class="sep">/</span>'
  if ($isFloor) { $crumb += '<a href="/vloeren/index.html">Vloeren</a><span class="sep">/</span>' }
  if ($isMaatwerk) { $crumb += '<a href="/interieur/index.html">Interieur op maat</a><span class="sep">/</span>' }
  if ($d.parent) { $crumb += "<a href=""$($d.parent.href)"">$($d.parent.label)</a><span class=""sep"">/</span>" }
  $crumb += "<span aria-current=""page"">$($d.name)</span>"

  # ---- 2 - Intro: twee foto's links, korte tekst rechts, rest achter "Lees meer" ----
  $introBig = NextImg
  $introSmall = NextImg
  $aboutFirst = $d.about.paras | Select-Object -First 1
  $aboutRest = @($d.about.paras | Select-Object -Skip 1)
  $aboutMore = ""
  if ($aboutRest.Count -gt 0) {
    $aboutMore = @"

          <details class="pr-more">
            <summary><span class="pr-more-open">Lees meer</span><span class="pr-more-close">Minder lezen</span></summary>
            $(Paras $aboutRest)
          </details>
"@
  }

  # ---- 3 - Soorten: fotokaarten (elke soort krijgt een foto) ----
  $typesSection = ""
  if ($d.types -and $d.types.items.Count -gt 0) {
  $types = ($d.types.items | ForEach-Object {
    $id = if ($_.id) { " id=""$($_.id)""" } else { "" }
    $src = if ($_.img) { $_.img } else { NextImg }
    $talt = if ($_.alt) { $_.alt } else { "$($_.title) &mdash; $($d.name)" }
    $tags = if ($_.tags) { '<div class="tag-row">' + (($_.tags | ForEach-Object { "<span class=""tag"">$_</span>" }) -join "") + '</div>' } else { "" }
    $moreLabel = if ($_.more) { $_.more } else { "Meer over $($_.title.ToLower())" }
    $more = if ($_.href) { "<a class=""btn-text pr-type-more"" href=""$($_.href)"">$moreLabel <span class=""arrow"">&rarr;</span></a>" } else { "" }
    @"
        <article class="pr-type"$id>
          <div class="pr-type-media"><img src="$(Img $src 900)" alt="$talt" loading="lazy"></div>
          <div class="pr-type-body">
            <h3>$($_.title)</h3>
            <p>$($_.text)</p>
            $tags$more
          </div>
        </article>
"@
  }) -join "`n"
  $cols = [Math]::Min($d.types.items.Count, 4)
  if ($d.types.items.Count -eq 5) { $cols = 3 }
  $typesSection = @"

  <!-- 3 - Soorten: fotokaarten -->
  <section class="pr-section is-surface" data-review-id="soorten" data-review-label="Soorten">
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
"@
  }

  # ---- 4 - Uitgelicht ----
  $featureSection = ""
  if ($d.feature) {
    $featureSection = @"

  <!-- 4 - Uitgelicht: grote foto op een beige vlak -->
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
"@
  }

  # ---- 5 - Voordelen: foto links, korte lijst met vinkjes rechts ----
  $benefitsSection = ""
  if ($d.benefits) {
    $bImg = NextImg
    $benefits = ($d.benefits.items | ForEach-Object {
      "          <li class=""pr-benefit""><span class=""pr-benefit-ico"">$CHECK</span><div><h3>$($_.title)</h3><p>$($_.text)</p></div></li>"
    }) -join "`n"
    $benefitsSection = @"

  <!-- 5 - Voordelen: foto + vinkjes -->
  <section class="pr-section pr-split-sec" data-review-id="voordelen" data-review-label="Voordelen">
    <div class="wrap pr-split">
      <div class="pr-split-media">
        <img src="$(Img $bImg 1400)" alt="$alt" loading="lazy">
        <p class="pr-split-note">Liever zelf voelen en vergelijken? <a href="/showroom.html">Kom langs in de showroom</a></p>
      </div>
      <div class="pr-split-copy">
        <h2>$($d.benefits.h2)</h2>
        <p class="eyebrow">Voordelen</p>
        <ul class="pr-benefits">
$benefits
        </ul>
      </div>
    </div>
  </section>
"@
  }

  # ---- 6 - Inspiratie: fotomozaiek ----
  $m = @(NextImg; NextImg; NextImg; NextImg)
  $mosaic = @"

  <!-- 6 - Inspiratie: fotomozaiek -->
  <section class="pr-section pr-inspire" data-review-id="inspiratie" data-review-label="Inspiratie">
    <div class="wrap">
      <div class="pr-head">
        <div>
          <h2>Laat u inspireren</h2>
          <p class="eyebrow">Binnenkijken</p>
        </div>
        <p class="pr-head-text">Een greep uit wat er mogelijk is met $($d.name.ToLower()). In onze showroom ziet u alles op ware grootte, in complete woonopstellingen. <a class="btn-text" href="/inspiratie/projecten.html">Bekijk projecten <span class="arrow">&rarr;</span></a></p>
      </div>
      <div class="pr-mosaic">
        <figure class="is-big"><img src="$(Img $m[0] 1400)" alt="$alt" loading="lazy"></figure>
        <figure><img src="$(Img $m[1] 900)" alt="$alt" loading="lazy"></figure>
        <figure><img src="$(Img $m[2] 900)" alt="$alt" loading="lazy"></figure>
        <figure class="is-wide"><img src="$(Img $m[3] 1400)" alt="$alt" loading="lazy"></figure>
      </div>
    </div>
  </section>
"@

  # ---- 7 - Reacties van klanten ----
  $reviewItems = ($QUOTES | ForEach-Object {
    "        <figure class=""pr-review""><blockquote>&ldquo;$($_.q)&rdquo;</blockquote><figcaption><span class=""pr-review-stars"" aria-label=""5 sterren"">&#9733;&#9733;&#9733;&#9733;&#9733;</span>$($_.who)</figcaption></figure>"
  }) -join "`n"
  $reviews = @"

  <!-- 7 - Wat klanten zeggen -->
  <section class="pr-section pr-reviews-sec" data-review-id="reviews" data-review-label="Reviews">
    <div class="wrap">
      <div class="pr-head">
        <div>
          <h2>Wat klanten zeggen</h2>
          <p class="eyebrow">Gewaardeerd met een 9+</p>
        </div>
      </div>
      <div class="pr-reviews">
$reviewItems
      </div>
    </div>
  </section>
"@

  # ---- 8 - Goed om te weten: uitklapvragen met een foto ernaast ----
  $infoSection = ""
  if ($d.info -and $d.info.rows.Count -gt 0) {
    $fImg = NextImg
    $first = $true
    $info = ($d.info.rows | ForEach-Object {
      $id = if ($_.id) { " id=""$($_.id)""" } else { "" }
      $open = if ($first) { " open" } else { "" }
      $first = $false
      @"
        <details class="pr-faq-item"$id$open>
          <summary><h3>$($_.title)</h3><span class="pr-faq-plus" aria-hidden="true"></span></summary>
          <div class="pr-faq-body">
          $(Paras $_.paras)
          </div>
        </details>
"@
    }) -join "`n"
    $infoSection = @"

  <!-- 8 - Goed om te weten: uitklapvragen -->
  <section class="pr-section is-surface" data-review-id="meer-weten" data-review-label="Meer weten">
    <div class="wrap pr-faq-grid">
      <div class="pr-faq-aside">
        <h2>$($d.info.h2)</h2>
        <p class="eyebrow">Goed om te weten</p>
        <div class="pr-faq-media"><img src="$(Img $fImg 900)" alt="$alt" loading="lazy"></div>
        <p class="pr-faq-ask">Staat uw vraag er niet bij? Bel <a href="tel:+31135368598">013 - 536 85 98</a> of <a href="/contact.html">stuur ons een bericht</a>.</p>
      </div>
      <div class="pr-faq">
$info
      </div>
    </div>
  </section>
"@
  }

  # ---- 9 - Merken (optioneel) ----
  $brands = ""
  if ($d.brands -and $d.brands.items.Count -gt 0) {
    $pills = ($d.brands.items | ForEach-Object { "<a class=""pr-brand"" href=""$($_.href)"">$($_.label)</a>" }) -join "`n        "
    $brands = @"

  <!-- 9 - Merken -->
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

  # ---- 11 - Verder kijken: fototegels ----
  $relSet = if ($d.related) { $d.related } elseif ($isFloor) { $FLOORS } elseif ($isMaatwerk) { $MAATWERK } else { $INTERIOR }
  $related = ($relSet | Where-Object { $_.href -ne "/$($d.file)" } | ForEach-Object {
    $rs = $HERO[$_.href]
    $ri = if ($rs) { "<span class=""pr-rel-img""><img src=""$(Img $rs 600)"" alt="""" loading=""lazy""></span>" } else { "" }
    "        <a href=""$($_.href)"">$ri<span class=""pr-rel-label"">$($_.label) <span class=""arrow"" aria-hidden=""true"">&rarr;</span></span></a>"
  }) -join "`n"
  $relTitle = if ($isFloor) { "Bekijk ook de andere vloersoorten" } else { "Bekijk ook" }

  $html = @"
<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>$($d.title) &mdash; De Vloerenspecialist Tilburg</title>
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

<script src="/assets/js/components/mega-icons.js" defer></script>
<script src="/assets/js/components/header.js" defer></script>
<script src="/assets/js/components/footer.js" defer></script>
<script src="/assets/js/modules/wishlist.js" defer></script>
<script src="/assets/js/modules/review-mode.js" defer></script>
<script src="/assets/js/modules/feedback-mode.js" defer></script>
<script src="/assets/js/modules/nav.js" defer></script>
<script src="/assets/js/modules/open-status.js" defer></script>
<script src="/assets/js/modules/product-motion.js" defer></script>
<script src="/assets/js/modules/depth.js" defer></script>
<script src="/assets/js/modules/intro-loader.js"></script>
</head>
<body data-page="sub">
<!-- Gegenereerd door tools/build-pages.ps1 uit tools/content/$($file.Name) - pas de inhoud daar aan. -->

<a class="skip-link" href="#main">Naar de inhoud</a>
<div id="site-header"></div>

<main id="main">

  <!-- 1 - Hero: kop en intro, daaronder een grote foto op een beige vlak -->
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
        <ul class="pr-hero-usps" aria-label="Waarom De Vloerenspecialist">
          <li>$CHECK Showroom van 1.800 m&sup2;</li>
          <li>$CHECK Eigen team plaatst alles</li>
          <li>$CHECK Klanten geven ons een 9+</li>
        </ul>
      </div>
    </div>
  </section>

  <!-- 2 - Intro: foto's + korte tekst -->
  <section class="pr-section pr-intro" data-review-id="over" data-review-label="Over $($d.name)">
    <div class="wrap pr-intro-grid">
      <div class="pr-intro-media">
        <img class="pr-intro-big" src="$(Img $introBig 1400)" alt="$alt" loading="lazy">
        <img class="pr-intro-small" src="$(Img $introSmall 900)" alt="" loading="lazy">
      </div>
      <div class="pr-intro-copy">
        <h2>$($d.about.h2)</h2>
        <p class="eyebrow">$($d.about.eyebrow)</p>
        <div class="pr-about-text">
          <p>$aboutFirst</p>$aboutMore
        </div>
      </div>
    </div>
  </section>
$typesSection$featureSection$benefitsSection$mosaic$reviews$infoSection$brands

  <!-- 10 - Kom langs -->
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

  <!-- 11 - Verder kijken: fototegels -->
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
