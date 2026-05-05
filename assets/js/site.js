(function () {
  const DATA = window.SITE_DATA || {};
  const CONTACT_FORM_URL = DATA.contactFormUrl || "";
  const state = {
    lang: "ja",
    filter: "all",
    carouselIndex: 0,
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const body = document.body;
  const assetPrefix = body.dataset.assetPrefix || "";

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function t(value, fallback = "") {
    if (!value || typeof value !== "object") return fallback;
    return value[state.lang] || value.en || value.ja || fallback;
  }

  function pageUrl(path) {
    if (!path) return "";
    if (/^https?:\/\//.test(path)) return path;
    return assetPrefix + path;
  }

  function assetUrl(path) {
    if (!path) return "";
    if (/^https?:\/\//.test(path) || path.startsWith("/")) return path;
    return assetPrefix + path;
  }

  function works() {
    return (DATA.works || []).slice();
  }

  function selectedWorks() {
    return works()
      .filter((work) => work.selectedListening)
      .sort((a, b) => (a.selectedOrder || 999) - (b.selectedOrder || 999))
      .slice(0, 5);
  }

  function ui(ja, en) {
    return state.lang === "ja" ? ja : en;
  }

  function categoryLabel(work) {
    return t(work.archiveCategoryName, work.archiveCategoryLabel || "");
  }

  function selectedCategoryLabel(work) {
    return state.lang === "ja" ? categoryLabel(work) : (work.selectedCategory || categoryLabel(work));
  }

  function statusBadge(label, extraClass = "") {
    return `<span class="status-badge ${extraClass}">${escapeHtml(label)}</span>`;
  }

  function workBadges(work) {
    const badges = [];
    if (work.audio?.url) badges.push(statusBadge("Audio", "badge-audio"));
    if (work.video?.url) badges.push(statusBadge("Video", "badge-video"));
    if (work.score?.pages?.length) badges.push(statusBadge("Score", "badge-score"));
    const award = t(work.award);
    if (award) badges.push(statusBadge(award, "badge-award"));
    return badges.join("");
  }

  function workTone(work) {
    const source = work.slug || work.id || "";
    const sum = source.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return `tone-${(sum % 6) + 1}`;
  }

  function graphic(work) {
    return `<div class="work-graphic ${workTone(work)}" aria-hidden="true"><span></span></div>`;
  }

  function imageSizeAttrs(image) {
    const width = image?.width ? ` width="${escapeHtml(image.width)}"` : "";
    const height = image?.height ? ` height="${escapeHtml(image.height)}"` : "";
    return `${width}${height}`;
  }

  function workImage(work, className = "", loading = "lazy") {
    const image = work.image || {};
    if (!image.src) {
      return `<figure class="work-image-frame ${className} work-image-fallback">${graphic(work)}</figure>`;
    }
    return `<figure class="work-image-frame ${className}" data-protected-image>
      <img class="work-image" src="${escapeHtml(assetUrl(image.src))}" alt="${escapeHtml(image.alt || `${t(work.title)} の抽象グラフィック`)}"${imageSizeAttrs(image)} loading="${loading}" decoding="async" draggable="false">
    </figure>`;
  }

  function dateOrYear(work) {
    if (work.unpremiered) return state.lang === "ja" ? "未初演" : "Not yet premiered";
    return work.premiere?.date && work.premiere.date !== "—" ? work.premiere.date : work.year;
  }

  function mediaEmbed(work) {
    const audio = work.audio || {};
    const video = work.video || {};
    if (audio.type === "soundcloud" && audio.embedUrl) {
      return `<div class="media-frame"><iframe title="${escapeHtml(t(work.title))} audio" scrolling="no" allow="autoplay" src="${escapeHtml(audio.embedUrl)}"></iframe></div>`;
    }
    if ((audio.type === "youtube" || video.embedUrl) && video.embedUrl) {
      return `<div class="media-frame"><iframe title="${escapeHtml(t(work.title))} video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen src="${escapeHtml(video.embedUrl)}"></iframe></div>`;
    }
    if (audio.type === "file" && audio.url) {
      return `<div class="media-frame"><audio controls preload="none" src="${escapeHtml(assetUrl(audio.url))}"></audio></div>`;
    }
    return `<p class="activity-body">${state.lang === "ja" ? "公開音源は準備中です。" : "Public audio is not currently available."}</p>`;
  }

  function scoreViewerMarkup(work) {
    const pages = work.score?.pages || [];
    if (!pages.length) return "";
    const thumbs = pages.map((page, index) => {
      const alt = scoreAlt(work, index);
      return `<button class="score-thumb" type="button" data-score-thumb="${index}" data-src="${escapeHtml(assetUrl(page))}" data-alt="${escapeHtml(alt)}" aria-label="${escapeHtml(ui(`スコア ${index + 1}ページ目を表示`, `Show score page ${index + 1}`))}">
        <img src="${escapeHtml(assetUrl(page))}" alt="" loading="lazy" decoding="async" draggable="false">
      </button>`;
    }).join("");
    return `<section class="detail-section" id="score-preview">
        <h2>${ui("スコア試し読み", "Score Preview")}</h2>
        <div class="score-viewer" data-score-viewer data-score-protected>
          <div class="score-stage">
            <button class="score-nav-button score-prev" type="button" data-score-prev aria-label="${ui("前のページ", "Previous page")}">‹</button>
            <figure class="score-preview">
              <img class="score-stage-image" data-score-main src="${escapeHtml(assetUrl(pages[0]))}" alt="${escapeHtml(scoreAlt(work, 0))}" loading="lazy" decoding="async" draggable="false">
            </figure>
            <button class="score-nav-button score-next" type="button" data-score-next aria-label="${ui("次のページ", "Next page")}">›</button>
          </div>
          <div class="score-footer">
            <p class="score-count"><span data-score-current>1</span> / ${pages.length}</p>
            <div class="score-thumbs" aria-label="${ui("スコアページ", "Score pages")}">${thumbs}</div>
          </div>
        </div>
      </section>`;
  }

  function initLanguage() {
    let stored = "ja";
    try {
      stored = localStorage.getItem("takumu-morita-lang") || "ja";
    } catch (error) {
      stored = "ja";
    }
    setLang(stored === "en" ? "en" : "ja", false);
    $$("[data-lang-button]").forEach((button) => {
      button.addEventListener("click", () => setLang(button.dataset.langButton));
    });
  }

  function setLang(lang, persist = true) {
    state.lang = lang === "en" ? "en" : "ja";
    body.classList.toggle("lang-ja", state.lang === "ja");
    body.classList.toggle("lang-en", state.lang === "en");
    document.documentElement.lang = state.lang;
    $$("[data-lang-button]").forEach((button) => {
      const pressed = button.dataset.langButton === state.lang;
      button.setAttribute("aria-pressed", String(pressed));
    });
    if (persist) {
      try {
        localStorage.setItem("takumu-morita-lang", state.lang);
      } catch (error) {
        /* localStorage can be unavailable in strict private modes. */
      }
    }
    renderPage();
  }

  function initMenu() {
    const toggle = $("[data-menu-toggle]");
    const nav = $("#site-navigation");
    if (!toggle || !nav) return;
    toggle.addEventListener("click", () => {
      const open = !body.classList.contains("menu-open");
      body.classList.toggle("menu-open", open);
      toggle.setAttribute("aria-expanded", String(open));
    });
    $$("a", nav).forEach((link) => {
      link.addEventListener("click", () => {
        body.classList.remove("menu-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  function renderCurrent() {
    const root = $('[data-render="current"]');
    const section = $('[data-section="current"]');
    if (!root) return;
    const activeNow = (DATA.now || []).filter((item) => item.active);
    const concertItems = (DATA.concerts || []).slice(0, 3);
    const items = concertItems.concat(activeNow).slice(0, 3);
    if (!items.length) {
      if (section) section.hidden = true;
      return;
    }
    if (section) section.hidden = false;
    root.innerHTML = `<div class="current-list">${items.map((item) => {
      const date = item.date ? t(item.date) : (state.lang === "ja" ? "制作中" : "In progress");
      const title = item.title ? t(item.title) : "";
      const venue = item.venue ? t(item.venue) : "";
      const bodyText = item.body ? t(item.body) : "";
      return `<article class="current-item">
        <div class="current-date">${escapeHtml(date)}</div>
        <div class="current-copy">
          ${title ? `<h3 class="current-title">${escapeHtml(title)}</h3>` : ""}
          ${venue ? `<p class="current-venue">${escapeHtml(venue)}</p>` : ""}
          ${bodyText ? `<div class="current-body">${bodyText}</div>` : ""}
        </div>
      </article>`;
    }).join("")}</div>`;
  }

  const heroSlideshowState = { shuffled: null, current: 0, slides: null };

  function renderHeroArt() {
    const root = $('[data-render="hero-art"]');
    if (!root) return;
    if (root.dataset.rendered !== "true") {
      const imageWorks = works().filter((work) => work.image?.src);
      if (!imageWorks.length) {
        root.innerHTML = `<div class="brand-graphic" aria-hidden="true">
          <span class="veil-plane veil-a"></span>
          <span class="veil-plane veil-b"></span>
          <span class="veil-plane veil-c"></span>
          <span class="veil-line"></span>
        </div>`;
        root.dataset.rendered = "true";
        return;
      }
      heroSlideshowState.shuffled = imageWorks
        .map((work) => ({ work, rank: Math.random() }))
        .sort((a, b) => a.rank - b.rank)
        .map((item) => item.work)
        .slice(0, Math.min(5, imageWorks.length));
      const shuffled = heroSlideshowState.shuffled;
      root.innerHTML = `<div class="hero-slideshow" data-hero-slideshow>
        ${shuffled.map((work, index) => `<figure class="hero-slide${index === 0 ? " is-active" : ""}" data-protected-image>
          <img src="${escapeHtml(assetUrl(work.image.src))}" alt="${escapeHtml(work.image.alt)}"${imageSizeAttrs(work.image)} loading="${index === 0 ? "eager" : "lazy"}" decoding="async" draggable="false">
        </figure>`).join("")}
        <div class="hero-slide-caption" data-hero-caption></div>
      </div>`;
      heroSlideshowState.slides = $$(".hero-slide", root);
      heroSlideshowState.current = 0;
      $$("img", root).forEach((img) => {
        const preload = new Image();
        preload.src = img.currentSrc || img.src;
      });
      if (heroSlideshowState.slides.length > 1) {
        window.setInterval(() => {
          const slides = heroSlideshowState.slides;
          const prev = heroSlideshowState.current;
          const next = (prev + 1) % slides.length;
          const nextImage = $("img", slides[next]);
          if (!nextImage || !nextImage.complete || nextImage.naturalWidth === 0) return;
          slides[next].classList.add("is-active");
          window.requestAnimationFrame(() => {
            slides[prev].classList.remove("is-active");
            heroSlideshowState.current = next;
            updateHeroCaption();
          });
        }, 7000);
      }
      root.dataset.rendered = "true";
    }
    updateHeroCaption();
  }

  function updateHeroCaption() {
    const caption = $('[data-hero-caption]');
    if (!caption || !heroSlideshowState.shuffled) return;
    const work = heroSlideshowState.shuffled[heroSlideshowState.current];
    caption.textContent = t(work.title);
  }

  function renderNewsHome() {
    const root = $('[data-render="news-home"]');
    if (!root) return;
    const items = (DATA.news || []).slice(0, 3);
    root.innerHTML = `<div class="news-list">${items.map((item) => {
      const content = `<span class="news-title">${t(item.title)}</span>`;
      const bodyText = `<div class="news-date">${escapeHtml(item.date)}</div>`;
      const linkAttrs = item.external ? ' target="_blank" rel="noopener noreferrer"' : "";
      const badgeClass = item.tag ? ` badge-${escapeHtml(item.tag)}` : "";
      const badge = item.badge ? `<div class="news-badge-cell"><span class="activity-badge${badgeClass}">${escapeHtml(t(item.badge))}</span></div>` : `<div class="news-badge-cell"></div>`;
      return `<div class="news-item">${bodyText}${badge}<div class="news-copy">${item.linkUrl ? `<a href="${escapeHtml(pageUrl(item.linkUrl))}"${linkAttrs}>${content}</a>` : content}</div></div>`;
    }).join("")}</div>`;
  }

  function renderActivity() {
    const root = $('[data-render="activity-list"]');
    if (!root) return;
    root.innerHTML = `<div class="activity-list">${(DATA.news || []).map((item) => {
      const linkAttrs = item.external ? ' target="_blank" rel="noopener noreferrer"' : "";
      const title = `<span class="activity-title">${t(item.title)}</span>`;
      const linked = item.linkUrl ? `<a href="${escapeHtml(pageUrl(item.linkUrl))}"${linkAttrs}>${title}</a>` : title;
      const badgeClass = item.tag ? ` badge-${escapeHtml(item.tag)}` : " badge-other";
      const badgeText = item.badge ? t(item.badge) : ui("その他", "Other");
      const badge = `<div class="activity-badge-cell"><span class="activity-badge${badgeClass}">${escapeHtml(badgeText)}</span></div>`;
      return `<article class="activity-item">
        <div class="activity-date">${escapeHtml(item.date)}</div>
        ${badge}
        <div class="activity-copy">${linked}<p class="activity-body">${t(item.body)}</p></div>
      </article>`;
    }).join("")}</div>`;
  }

  function renderHomeSelected() {
    const root = $('[data-render="home-selected"]');
    if (!root) return;
    const items = selectedWorks();
    state.carouselIndex = Math.min(state.carouselIndex, Math.max(items.length - 1, 0));
    root.innerHTML = `<div class="home-carousel" role="region" aria-label="Selected Listening carousel" tabindex="0">
      <div class="carousel-viewport">
        <div class="carousel-track">
          ${items.map((work, index) => `<section class="carousel-slide" aria-label="${index + 1} / ${items.length}">
            <div class="selected-card">
              ${workImage(work, "selected-image", index === 0 ? "eager" : "lazy")}
              <div class="selected-copy">
                <p class="work-category">${escapeHtml(selectedCategoryLabel(work))}</p>
                <h3 class="selected-title">${escapeHtml(t(work.title))}</h3>
                <p class="selected-meta">${escapeHtml(t(work.instrumentation))} / ${escapeHtml(dateOrYear(work))}</p>
                <p class="selected-note">${escapeHtml(t(work.shortNote) || t(work.note)).replace(/。\s*.+$/, "。")}</p>
                <div class="carousel-actions">
                  <a class="button primary" href="${escapeHtml(pageUrl(work.detailUrl))}#audio-video">${ui("試聴", "Listen")}</a>
                  <a class="text-link" href="${escapeHtml(pageUrl(work.detailUrl))}">${ui("詳細を見る", "View details")}</a>
                </div>
              </div>
            </div>
          </section>`).join("")}
        </div>
      </div>
      <div class="carousel-controls">
        <div class="arrow-group">
          <button class="icon-button" type="button" data-carousel-prev aria-label="Previous work">‹</button>
          <button class="icon-button" type="button" data-carousel-next aria-label="Next work">›</button>
        </div>
        <div class="dots" aria-label="Carousel pages">
          ${items.map((work, index) => `<button type="button" data-carousel-dot="${index}" aria-label="Show ${escapeHtml(t(work.title))}"></button>`).join("")}
        </div>
      </div>
    </div>`;
    initCarousel(root, items.length);
  }

  function initCarousel(root, count) {
    const carousel = $(".home-carousel", root);
    const track = $(".carousel-track", root);
    const dots = $$("[data-carousel-dot]", root);
    if (!carousel || !track || !count) return;

    function update() {
      track.style.transform = `translateX(${-state.carouselIndex * 100}%)`;
      dots.forEach((dot, index) => dot.setAttribute("aria-current", String(index === state.carouselIndex)));
    }

    function go(delta) {
      state.carouselIndex = (state.carouselIndex + delta + count) % count;
      update();
    }

    $("[data-carousel-prev]", root)?.addEventListener("click", () => go(-1));
    $("[data-carousel-next]", root)?.addEventListener("click", () => go(1));
    dots.forEach((dot) => {
      dot.addEventListener("click", () => {
        state.carouselIndex = Number(dot.dataset.carouselDot || 0);
        update();
      });
    });
    carousel.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    });

    let startX = null;
    carousel.addEventListener("touchstart", (event) => {
      startX = event.changedTouches[0].clientX;
    }, { passive: true });
    carousel.addEventListener("touchend", (event) => {
      if (startX === null) return;
      const delta = event.changedTouches[0].clientX - startX;
      if (Math.abs(delta) > 38) go(delta > 0 ? -1 : 1);
      startX = null;
    }, { passive: true });

    update();
  }

  function renderListenList() {
    const root = $('[data-render="listen-list"]');
    if (!root) return;
    root.innerHTML = `<div class="listen-list">${selectedWorks().map((work) => `<article class="listen-item">
      ${workImage(work, "listen-image")}
      <div class="listen-copy">
        <p class="work-category">${escapeHtml(selectedCategoryLabel(work))}</p>
        <h2>${escapeHtml(t(work.title))}</h2>
        <p class="selected-meta">${escapeHtml(t(work.instrumentation))} / ${escapeHtml(dateOrYear(work))}</p>
        <p>${escapeHtml(t(work.shortNote) || t(work.note))}</p>
        ${mediaEmbed(work)}
        <div class="carousel-actions" style="margin-top:18px;">
          <a class="text-link" href="${escapeHtml(pageUrl(work.detailUrl))}">${ui("詳細を見る", "View details")}</a>
        </div>
      </div>
    </article>`).join("")}</div>`;
  }

  function initWorksFilters() {
    const root = $(".filter-bar");
    if (!root) return;
    $$("[data-filter]", root).forEach((button) => {
      button.addEventListener("click", () => {
        state.filter = button.dataset.filter || "all";
        $$("[data-filter]", root).forEach((item) => {
          item.setAttribute("aria-pressed", String(item.dataset.filter === state.filter));
        });
        renderWorksList();
      });
    });
  }

  function renderWorksList() {
    const root = $('[data-render="works-list"]');
    if (!root) return;
    const filtered = works().filter((work) => work.inList && (state.filter === "all" || work.archiveCategory === state.filter));
    root.innerHTML = `<div class="works-list">
      <div class="works-header" aria-hidden="true">
        <span></span><span>${ui("初演日", "Premiere date")}</span><span>${ui("作品", "Work")}</span><span>${ui("編成", "Instrumentation")}</span><span>${ui("時間", "Duration")}</span><span>${ui("委嘱", "Commissioner")}</span><span>${ui("公開情報", "Info")}</span>
      </div>
      ${filtered.map((work) => {
        const titleText = `${escapeHtml(t(work.title))}<small>${escapeHtml(work.title.en)}</small>`;
        const title = work.hasDetail ? `<a class="work-title-link" href="${escapeHtml(pageUrl(work.detailUrl))}">${titleText}</a>` : `<span>${titleText}</span>`;
        return `<article class="work-row" data-category="${escapeHtml(work.archiveCategory)}">
          <div class="work-row-media">${workImage(work, "work-thumb")}</div>
          <div class="work-cell date" data-label="${ui("初演日", "Premiere date")}">${escapeHtml(dateOrYear(work))}</div>
          <div class="work-row-title">${title}</div>
          <div class="work-cell instrumentation" data-label="${ui("編成", "Instrumentation")}">${escapeHtml(t(work.instrumentation))}</div>
          <div class="work-cell duration" data-label="${ui("時間", "Duration")}">${escapeHtml(t(work.duration))}</div>
          <div class="work-cell commissioner" data-label="${ui("委嘱", "Commissioner")}">${escapeHtml(t(work.commissioner))}</div>
          <div class="work-badges" data-label="${ui("公開情報", "Info")}">${workBadges(work)}</div>
        </article>`;
      }).join("")}
    </div>`;
  }

  function renderWorkDetail() {
    const root = $('[data-render="work-detail"]');
    if (!root) return;
    const workId = body.dataset.workId;
    const work = works().find((item) => item.id === workId);
    if (!work) {
      root.innerHTML = `<p>${state.lang === "ja" ? "作品情報が見つかりません。" : "Work data was not found."}</p>`;
      return;
    }
    const award = t(work.award);
    const note = t(work.note) || t(work.shortNote);
    const scoreSection = scoreViewerMarkup(work);
    root.innerHTML = `<p class="breadcrumb"><a href="${escapeHtml(pageUrl("works.html"))}">${ui("作品", "Works")}</a> / ${escapeHtml(t(work.title))}</p>
      <div class="detail-hero">
        <div>
          <p class="work-category">${escapeHtml(categoryLabel(work))}</p>
          <h1 class="detail-main-title">${escapeHtml(t(work.title))}</h1>
          <p class="detail-subtitle">${escapeHtml(work.title.en)}</p>
          <div class="work-badges detail-badges">${workBadges(work)}</div>
          <dl class="detail-meta">
            ${fact("編成", "Instrumentation", t(work.instrumentation))}
            ${fact("演奏時間", "Duration", t(work.duration))}
            ${fact("作曲年", "Year", work.year)}
            ${fact("初演", "Premiere", work.premiere.date)}
            ${fact("初演者", "Performers", t(work.premiere.ensemble))}
            ${fact("初演地", "Venue", t(work.premiere.venue))}
            ${fact("委嘱", "Commissioner", t(work.commissioner))}
            ${award ? fact("受賞・採択", "Award / Selection", award) : ""}
          </dl>
          <div class="detail-actions">
            <a class="button primary" href="#audio-video">${ui("試聴", "Listen")}</a>
            <a class="button secondary" href="${CONTACT_FORM_URL}" target="_blank" rel="noopener noreferrer">${ui("この作品について問い合わせる", "Ask about this work")}</a>
          </div>
        </div>
        ${workImage(work, "detail-image", "eager")}
      </div>

      <section class="detail-section" id="audio-video">
        <h2>${ui("音源・映像", "Audio / Video")}</h2>
        ${mediaEmbed(work)}
      </section>

      <section class="detail-section" id="program-note">
        <h2>${ui("プログラムノート", "Program Note")}</h2>
        <div>${note || (state.lang === "ja" ? "プログラムノートは準備中です。" : "Program note is in preparation.")}</div>
      </section>

      ${scoreSection}

      <section class="detail-section" id="performance-materials">
        <h2>${ui("演奏資料", "Performance Materials")}</h2>
        <div class="materials-panel">
          <p>${state.lang === "ja" ? "演奏用スコア、パート譜、電子音響資料、再演・許諾については、作品名と用途を添えてお問い合わせください。" : "For performance scores, parts, electronic materials, permissions, or repeat performances, please include the work title and intended use."}</p>
          <a class="button secondary" href="${CONTACT_FORM_URL}" target="_blank" rel="noopener noreferrer">${ui("この作品について問い合わせる", "Ask about this work")}</a>
        </div>
      </section>

      <section class="detail-section">
        <a class="text-link" href="${escapeHtml(pageUrl("works.html"))}">${ui("作品一覧へ戻る", "Back to Works")}</a>
      </section>`;
    initScoreViewers(root);
  }

  function initScoreViewers(root = document) {
    $$("[data-score-viewer]", root).forEach((viewer) => {
      if (viewer.dataset.initialized === "true") return;
      viewer.dataset.initialized = "true";
      const main = $("[data-score-main]", viewer);
      const current = $("[data-score-current]", viewer);
      const thumbs = $$("[data-score-thumb]", viewer);
      if (!main || !thumbs.length) return;
      let index = 0;

      function show(nextIndex) {
        index = (nextIndex + thumbs.length) % thumbs.length;
        const thumb = thumbs[index];
        const src = thumb.dataset.src || "";
        const alt = thumb.dataset.alt || "";
        if (src && main.getAttribute("src") !== src) main.setAttribute("src", src);
        if (alt) main.setAttribute("alt", alt);
        if (current) current.textContent = String(index + 1);
        thumbs.forEach((button, thumbIndex) => button.setAttribute("aria-current", String(thumbIndex === index)));
      }

      $("[data-score-prev]", viewer)?.addEventListener("click", () => show(index - 1));
      $("[data-score-next]", viewer)?.addEventListener("click", () => show(index + 1));
      thumbs.forEach((thumb) => {
        thumb.addEventListener("click", () => show(Number(thumb.dataset.scoreThumb || 0)));
      });
      viewer.addEventListener("keydown", (event) => {
        if (event.key === "ArrowLeft") show(index - 1);
        if (event.key === "ArrowRight") show(index + 1);
      });
      show(0);
    });
  }

  function renderScoresFeatured() {
    const root = $('[data-render="scores-featured"]');
    if (!root) return;
    const priority = new Set(["parallax", "hikari-to-kumo", "zapping-shower", "manekko", "defocusing-ii"]);
    const items = works()
      .filter((work) => work.hasDetail && work.image?.src && (priority.has(work.id) || work.score?.pages?.length))
      .sort((a, b) => {
        const pa = priority.has(a.id) ? 0 : 1;
        const pb = priority.has(b.id) ? 0 : 1;
        return pa - pb || (a.selectedOrder || 999) - (b.selectedOrder || 999);
      })
      .slice(0, 6);
    root.innerHTML = `<div class="score-work-grid">${items.map((work) => `<a class="score-work-card" href="${escapeHtml(pageUrl(work.detailUrl))}#score-preview">
      ${workImage(work, "score-work-image")}
      <span>${escapeHtml(t(work.title))}</span>
    </a>`).join("")}</div>`;
  }

  function renderShopTable() {
    const root = $('[data-render="shop-table"]');
    if (!root) return;
    const items = works().filter((work) => work.inShop);
    root.innerHTML = `<div class="table-scroll">
      <table class="price-table">
        <thead>
          <tr>
            <th>${ui("作品", "Work")}</th>
            <th>${ui("編成", "Instrumentation")}</th>
            <th>${ui("スコア", "Score")}</th>
            <th>${ui("スコア＆パート譜", "Score & Parts")}</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((work) => {
            const score = work.score?.priceScore || (work.score?.pages?.length ? ui("試し読み可", "Preview available") : ui("お問い合わせ", "Please enquire"));
            let set = work.score?.priceSet || (["wind", "orchestra"].includes(work.archiveCategory) ? ui("レンタル・個別相談", "Rental / consultation required") : ui("お問い合わせ", "Please enquire"));
            if (state.lang === "en" && set === "レンタル・個別相談") set = "Rental / consultation required";
            const title = work.hasDetail
              ? `<a href="${escapeHtml(pageUrl(work.detailUrl))}">${escapeHtml(t(work.title))}</a>`
              : escapeHtml(t(work.title));
            return `<tr>
              <td><strong>${title}</strong><span>${escapeHtml(work.title.en)}</span></td>
              <td>${escapeHtml(t(work.instrumentation))}</td>
              <td>${escapeHtml(score)}</td>
              <td>${escapeHtml(set)}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>`;
  }

  function scoreAlt(work, index) {
    const page = index + 1;
    return state.lang === "ja"
      ? `${t(work.title)} のスコア試し読み ${page}ページ目`
      : `Score preview page ${page} of ${work.title.en || t(work.title)}`;
  }

  function fact(labelJa, labelEn, value) {
    return `<div class="fact"><dt>${escapeHtml(ui(labelJa, labelEn))}</dt><dd>${escapeHtml(value || "—")}</dd></div>`;
  }

  function renderPage() {
    renderHeroArt();
    renderCurrent();
    renderNewsHome();
    renderHomeSelected();
    renderListenList();
    renderActivity();
    renderWorksList();
    renderWorkDetail();
    renderScoresFeatured();
    renderShopTable();
  }

  document.addEventListener("DOMContentLoaded", () => {
    initMenu();
    initWorksFilters();
    document.addEventListener("contextmenu", (event) => {
      if (event.target.closest("[data-protected-image], [data-score-protected]")) event.preventDefault();
    });
    document.addEventListener("dragstart", (event) => {
      if (event.target.closest("[data-protected-image], [data-score-protected]")) event.preventDefault();
    });
    initLanguage();
  });
}());
