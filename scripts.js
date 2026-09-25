/* ============================================================
   AFLOR · Inteligência Operacional Aplicada
   scripts.js — V1
   Mínimo: menu mobile · smooth scroll · header scroll · ano
   ============================================================ */

(function () {
  'use strict';

  /* ── 1. MENU MOBILE ──────────────────────────────────────── */

  const hamburger = document.getElementById('hamburger');
  const header    = document.getElementById('site-header');
  const backToTop = document.querySelector('[data-back-to-top]');

  // Criar o painel de nav mobile dinamicamente
  function buildMobileNav() {
    const existing = document.querySelector('.mobile-nav');
    if (existing) return existing;

    const navLinks = [
      { href: '#aflor-flow',      label: 'AFLOR Flow' },
      { href: '#dados-operacao',  label: 'Operações' },
      { href: '#aplicacoes',      label: 'Aplicações' },
      { href: '#contato',         label: 'Contato' },
    ];

    const nav = document.createElement('nav');
    nav.className = 'mobile-nav';
    nav.setAttribute('aria-label', 'Menu mobile');
    nav.id = 'mobile-nav';

    navLinks.forEach(function (item) {
      const a = document.createElement('a');
      a.href = item.href;
      a.textContent = item.label;
      nav.appendChild(a);
    });

    // Inserir após o header
    header.insertAdjacentElement('afterend', nav);
    return nav;
  }

  function toggleMenu(forceClose) {
    const mobileNav = buildMobileNav();
    const isOpen    = mobileNav.classList.contains('open');
    const shouldOpen = forceClose ? false : !isOpen;

    mobileNav.classList.toggle('open', shouldOpen);
    hamburger.classList.toggle('open', shouldOpen);
    hamburger.setAttribute('aria-expanded', String(shouldOpen));
    hamburger.setAttribute('aria-label', shouldOpen ? 'Fechar menu' : 'Abrir menu');
  }

  if (hamburger) {
    buildMobileNav();
    hamburger.addEventListener('click', function () {
      toggleMenu();
    });
  }

  // Fechar ao clicar em qualquer link do mobile nav
  document.addEventListener('click', function (e) {
    const mobileNav = document.querySelector('.mobile-nav');
    if (!mobileNav) return;

    const isInsideNav   = mobileNav.contains(e.target);
    const isHamburger   = hamburger && hamburger.contains(e.target);
    const isNavLink     = e.target.tagName === 'A' && isInsideNav;

    if (isNavLink) {
      toggleMenu(true);
    } else if (!isInsideNav && !isHamburger && mobileNav.classList.contains('open')) {
      toggleMenu(true);
    }
  });

  // Fechar com ESC
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      const mobileNav = document.querySelector('.mobile-nav');
      if (mobileNav && mobileNav.classList.contains('open')) {
        toggleMenu(true);
        hamburger && hamburger.focus();
      }
    }
  });


  /* ── 2. SMOOTH SCROLL PARA ÂNCORAS INTERNAS ─────────────── */

  document.addEventListener('click', function (e) {
    const anchor = e.target.closest('a[href^="#"]');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href || href === '#') return;

    const target = document.querySelector(href);
    if (!target) return;

    e.preventDefault();

    const headerHeight = header ? header.offsetHeight : 0;
    const targetTop    = target.getBoundingClientRect().top + window.scrollY - headerHeight - 8;

    window.scrollTo({
      top: targetTop,
      behavior: 'smooth',
    });
  });


  /* ── 3. CLASSE SCROLLED NO HEADER ───────────────────────── */

  function onScroll() {
    if (header) {
      if (window.scrollY > 16) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }

    if (backToTop) {
      backToTop.classList.toggle('is-visible', window.scrollY > 600);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // Estado inicial

  if (backToTop) {
    backToTop.addEventListener('click', function () {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }


  /* ── 4. ANO DINÂMICO NO RODAPÉ ───────────────────────────── */

  const yearEl = document.getElementById('footer-year');
  if (yearEl) {
    const year = new Date().getFullYear();
    yearEl.textContent = year >= 2026 ? year : 2026;
  }


  /* ── 5. LIGHTBOX DAS SOLUÇÕES AFLOR ────────────────────── */

  const solutionLightbox = document.getElementById('solution-lightbox');

  if (solutionLightbox) {
    const lightboxImage = solutionLightbox.querySelector('.solution-lightbox__image');
    const lightboxClose = solutionLightbox.querySelector('.solution-lightbox__close');
    let lightboxTrigger = null;

    function closeSolutionLightbox() {
      solutionLightbox.classList.remove('is-open');
      solutionLightbox.setAttribute('aria-hidden', 'true');
      lightboxImage.removeAttribute('src');
      lightboxImage.alt = '';
      lightboxTrigger && lightboxTrigger.focus();
    }

    document.querySelectorAll('#solucoes-aflor .card-asset-slot').forEach(function (image) {
      image.setAttribute('role', 'button');
      image.setAttribute('tabindex', '0');
      image.setAttribute('aria-label', 'Ampliar imagem: ' + image.alt);

      function openSolutionLightbox() {
        lightboxTrigger = image;
        lightboxImage.src = image.currentSrc || image.src;
        lightboxImage.alt = image.alt;
        solutionLightbox.classList.add('is-open');
        solutionLightbox.setAttribute('aria-hidden', 'false');
        lightboxClose.focus();
      }

      image.addEventListener('click', openSolutionLightbox);
      image.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openSolutionLightbox();
        }
      });
    });

    lightboxClose.addEventListener('click', closeSolutionLightbox);
    solutionLightbox.addEventListener('click', function (e) {
      if (e.target === solutionLightbox) closeSolutionLightbox();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && solutionLightbox.classList.contains('is-open')) {
        closeSolutionLightbox();
      }
    });
  }


  /* ── 6. CARROSSEL MANUAL DE OPERAÇÃO E DIAGNÓSTICOS ─────── */

  const platformCarousel = document.querySelector('#dados-operacao .platform-carousel');

  if (platformCarousel) {
    const slides = Array.from(platformCarousel.querySelectorAll('.platform-carousel-slide'));
    const dots   = Array.from(platformCarousel.querySelectorAll('.platform-carousel-dot'));
    const prev   = platformCarousel.querySelector('[data-platform-carousel-prev]');
    const next   = platformCarousel.querySelector('[data-platform-carousel-next]');
    let activeIndex = 0;

    function showPlatformSlide(index) {
      activeIndex = (index + slides.length) % slides.length;

      slides.forEach(function (slide, slideIndex) {
        const isActive = slideIndex === activeIndex;
        slide.classList.toggle('is-active', isActive);
        slide.setAttribute('aria-hidden', String(!isActive));
      });

      dots.forEach(function (dot, dotIndex) {
        const isActive = dotIndex === activeIndex;
        dot.classList.toggle('is-active', isActive);
        dot.setAttribute('aria-pressed', String(isActive));
      });
    }

    prev && prev.addEventListener('click', function () {
      showPlatformSlide(activeIndex - 1);
    });

    next && next.addEventListener('click', function () {
      showPlatformSlide(activeIndex + 1);
    });

    dots.forEach(function (dot) {
      dot.addEventListener('click', function () {
        showPlatformSlide(Number(dot.dataset.platformCarouselDot));
      });
    });

    showPlatformSlide(0);
  }

  /* Vídeo da operação — criado apenas quando solicitado no carrossel. */
  const operationVideoTrigger = document.querySelector('[data-operation-video-open]');
  const operationVideoModal = document.querySelector('[data-operation-video-modal]');

  if (operationVideoTrigger && operationVideoModal) {
    const operationVideoClose = operationVideoModal.querySelector('[data-operation-video-close]');
    const operationVideoMount = operationVideoModal.querySelector('[data-operation-video-mount]');

    function closeOperationVideo() {
      const video = operationVideoMount.querySelector('video');
      if (video) {
        video.pause();
        video.querySelectorAll('source').forEach(function (source) {
          source.removeAttribute('src');
        });
        video.load();
      }
      operationVideoMount.replaceChildren();
      operationVideoModal.hidden = true;
      operationVideoModal.setAttribute('aria-hidden', 'true');
      operationVideoTrigger.focus();
    }

    function openOperationVideo() {
      const video = document.createElement('video');
      video.controls = true;
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.preload = 'metadata';
      video.setAttribute('aria-label', 'Vídeo institucional AFLOR em movimento');

      [['assets/video/aflor-em-movimento.webm', 'video/webm'], ['assets/video/aflor-em-movimento.mp4', 'video/mp4']].forEach(function ([src, type]) {
        const source = document.createElement('source');
        source.src = src;
        source.type = type;
        video.append(source);
      });

      operationVideoMount.replaceChildren(video);
      operationVideoModal.hidden = false;
      operationVideoModal.setAttribute('aria-hidden', 'false');
      video.play().catch(() => {});
      operationVideoClose.focus();
    }

    operationVideoTrigger.addEventListener('click', openOperationVideo);
    operationVideoClose.addEventListener('click', closeOperationVideo);
    operationVideoModal.addEventListener('click', function (event) {
      if (event.target === operationVideoModal) closeOperationVideo();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !operationVideoModal.hidden) closeOperationVideo();
    });
  }


  /* ── 7. PLACEHOLDER LOGOS PARCEIROS ─────────────────────── */

  // Quando img de parceiro falha, o onerror no HTML já adiciona a classe.
  // Este script garante que slots sem img também fiquem visualmente OK.
  document.querySelectorAll('.logo-slot').forEach(function (slot) {
    const img = slot.querySelector('img');
    if (!img) {
      slot.classList.add('logo-slot--empty');
    }
  });


  /* ── 8. ORGANIZAÇÃO PROGRESSIVA — dispersão, espiral e IA Flow ── */
  const interactiveHero = document.querySelector('[data-hero-scroll]');
  if (interactiveHero) {
    const svg = interactiveHero.querySelector('.cv-scene');
    const sticky = interactiveHero.querySelector('.new-lp-hero__sticky');
    const foreground = interactiveHero.querySelector('.new-lp-hero__foreground');
    const product = foreground.querySelector('.new-lp-hero__product');
    const signature = foreground.querySelector('.new-lp-hero__signature');
    const pause = interactiveHero.querySelector('.cv-pause');
    const intelligence = interactiveHero.querySelector('.cv-intelligence');
    const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
    const compactQuery = matchMedia('(max-height: 560px)');
    const layers = Array.from(svg.querySelectorAll('.cv-depth'));
    const ns = 'http://www.w3.org/2000/svg';
    const clamp = x => Math.max(0, Math.min(1, x));
    const mix = (a, b, p) => a + (b - a) * p;
    const phase = (p, a, b) => { const v = clamp((p - a) / (b - a)); return v * v * (3 - 2 * v); };
    function element(tag, attributes, parent) {
      const el = document.createElementNS(ns, tag);
      Object.keys(attributes).forEach(key => el.setAttribute(key, attributes[key]));
      if (parent) parent.appendChild(el);
      return el;
    }
    const glyphs = [
      'M-31-18H-9M-31-10H17M-31-2H8M-31 6H25M-31 14H-4M-20-22V19M8-14V19M-35 22H32',
      'M-25 21V-23H13L26-10V9M13-23V-10H26M-16-8H5M-16 0H15M-16 8H8M-11 19L-5 25L9 12',
      'M-32 14H-15V-4H5V-17H29M-32 5H-23M-7 5H9M16-6H29M21-23L29-17L23-10',
      'M0 24C-12 10-18 2-18-8A18 18 0 0 1 18-8C18 2 12 10 0 24ZM0-14A6 6 0 1 0 0-2A6 6 0 0 0 0-14',
      'M-29-17H22Q30-17 30-9V8Q30 16 22 16H-7L-18 25V16H-29Q-37 16-37 8V-9Q-37-17-29-17ZM-23-5H16M-23 4H8',
      'M-32-22H32V22H-32ZM-26 14L-10-2L1 8L12-5L27 14M17-12A5 5 0 1 0 17-2A5 5 0 0 0 17-12',
      'M-31-22H31V22H-31ZM-10-22V22M10-22V22M-31-7H31M-31 7H31',
      'M-24 22V-24H13L26-11V19M13-24V-11H26M-15-6H13M-15 3H15M-15 12H5'
    ];
    const names = ['REGISTRO', 'EVIDÊNCIA', 'SITUAÇÃO', 'LOCALIZAÇÃO', 'MENSAGEM', 'FOTO', 'PLANILHA', 'PAPEL'];
    const families = [0, 3, 6, 7, 4, 5, 1, 1, 1, 2, 0, 3, 4, 5, 6, 7, 0, 2];
    const desktopScatter = [
      [.08,.13],[.25,.08],[.43,.13],[.69,.09],[.88,.16],[.95,.32],
      [.87,.52],[.92,.73],[.76,.88],[.57,.84],[.39,.91],[.21,.84],
      [.08,.69],[.13,.49],[.07,.30],[.34,.23],[.67,.25],[.86,.28]
    ];
    const mobileScatter = [
      [.16,.11],[.51,.08],[.82,.13],[.88,.28],[.15,.29],
      [.09,.62],[.88,.62],[.17,.82],[.52,.88],[.84,.82]
    ];
    const records = Array.from({ length: 18 }, (_, id) => {
      const depth = id < 6 ? 0 : id < 14 ? 1 : 2;
      const family = families[id];
      const group = element('g', { class: 'cv-record', 'data-cv-record': id, 'data-family': names[family] }, layers[depth]);
      element('path', { class: 'cv-record__back', d: 'M-36-28H34V29H-36Z' }, group);
      const ink = element('path', { class: 'cv-record__ink', d: glyphs[family] }, group);
      const label = element('text', { class: 'cv-record__label', x: -31, y: 38 }, group);
      label.textContent = names[family];
      return { id, depth, family, group, ink, label };
    });
    let width = 1440, height = 820, mobile = false, reduced = motionQuery.matches;
    let frame = 0, last = 0, progress = 0, target = 0, ambientTime = 0;
    let visible = false, paused = false, measured = false;
    let headerHeight = 80;
    let titleSafe = { centerX: 0, centerY: 0, halfWidth: 0, halfHeight: 0 };
    function measure() {
      const bounds = sticky.getBoundingClientRect();
      width = Math.max(1, bounds.width); height = Math.max(1, bounds.height); mobile = width <= 700;
      headerHeight = document.querySelector('header')?.getBoundingClientRect().height || (mobile ? 64 : 80);
      interactiveHero.style.setProperty('--cv-header', headerHeight + 'px');
      svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
      const titleBounds = product.getBoundingClientRect();
      const signatureBounds = signature.getBoundingClientRect();
      const safeLeft = Math.min(titleBounds.left, signatureBounds.left) - bounds.left;
      const safeRight = Math.max(titleBounds.right, signatureBounds.right) - bounds.left;
      const safeTop = Math.min(titleBounds.top, signatureBounds.top) - bounds.top;
      const safeBottom = Math.max(titleBounds.bottom, signatureBounds.bottom) - bounds.top;
      titleSafe = {
        centerX: (safeLeft + safeRight) / 2,
        centerY: (safeTop + safeBottom) / 2,
        halfWidth: (safeRight - safeLeft) / 2,
        halfHeight: (safeBottom - safeTop) / 2
      };
      records.forEach(record => {
        const id = record.id, hidden = mobile && id >= 10;
        record.group.style.display = hidden ? 'none' : '';
        const depth = mobile ? (id < 4 ? 0 : 1) : record.depth;
        layers[depth].appendChild(record.group);
        record.currentDepth = depth;
        record.group.dataset.depth = String(depth);
      });
      measured = true; readScroll(); render(0);
    }
    function readScroll() {
      const rect = interactiveHero.getBoundingClientRect();
      const stickyRect = sticky.getBoundingClientRect();
      target = compactQuery.matches || reduced ? 1 : clamp((headerHeight - rect.top) / Math.max(1, interactiveHero.offsetHeight - sticky.offsetHeight));
      visible = stickyRect.bottom > headerHeight && stickyRect.top < innerHeight;
      lifecycle();
    }
    function keepTitleClear(x, y, halfWidth, halfHeight) {
      const dx = x - titleSafe.centerX;
      const dy = y - titleSafe.centerY;
      const safeX = titleSafe.halfWidth + halfWidth + 8;
      const safeY = titleSafe.halfHeight + halfHeight + 8;
      if (Math.abs(dx) >= safeX || Math.abs(dy) >= safeY) return [x, y];
      const scaleX = safeX / Math.max(.001, Math.abs(dx));
      const scaleY = safeY / Math.max(.001, Math.abs(dy));
      let projection = Math.min(scaleX, scaleY);
      let projectedX = titleSafe.centerX + dx * projection;
      let projectedY = titleSafe.centerY + dy * projection;
      if (projectedX - halfWidth < 4 || projectedX + halfWidth > width - 4) {
        projection = scaleY;
        projectedX = titleSafe.centerX + dx * projection;
        projectedY = titleSafe.centerY + dy * projection;
      }
      if (projectedY - halfHeight < 4 || projectedY + halfHeight > height - 4) {
        projection = scaleX;
        projectedX = titleSafe.centerX + dx * projection;
        projectedY = titleSafe.centerY + dy * projection;
      }
      return [
        Math.max(halfWidth + 4, Math.min(width - halfWidth - 4, projectedX)),
        Math.max(halfHeight + 4, Math.min(height - halfHeight - 4, projectedY))
      ];
    }
    function render(dt) {
      if (!measured) return;
      if (reduced || compactQuery.matches) progress = target = 1;
      else progress = mix(progress, target, 1-Math.exp(-dt*9));
      const organizing = phase(progress, .20, .35);
      const shrinking = phase(progress, .20, .40);
      const contracting = phase(progress, .65, .85);
      const absorption = phase(progress, .85, .92);
      const finalReveal = phase(progress, .92, 1);
      const dataPresence = 1 - absorption;
      const ambientPresence = 1 - phase(progress, .32, .65);
      const titleIntensity = phase(progress, .10, .85);
      const titleRelease = phase(progress, .92, 1);
      const visibleCount = mobile ? 10 : records.length;
      const centerX = titleSafe.centerX;
      const centerY = titleSafe.centerY;
      const scatter = mobile ? mobileScatter : desktopScatter;
      records.forEach(record => {
        const { id, currentDepth: depth } = record;
        if (mobile && id >= 10) return;
        const fraction = id / Math.max(1, visibleCount - 1);
        const baseAngle = -1.35 + id * 2.399963;
        const orbitAngle = baseAngle + phase(progress, .35, .85) * Math.PI * 2 * .72;
        const radiusFactor = mix(1, .28, contracting) * (1 - absorption);
        const radiusX = mobile
          ? width * mix(.37, .29, fraction) * radiusFactor
          : mix(Math.min(500, width*.42), Math.min(380, width*.34), fraction) * radiusFactor;
        const radiusY = mobile
          ? height * mix(.33, .25, fraction) * radiusFactor
          : mix(Math.min(280, height*.34), Math.min(210, height*.25), fraction) * radiusFactor;
        const orbitX = centerX + Math.cos(orbitAngle) * radiusX;
        const orbitY = centerY + Math.sin(orbitAngle) * radiusY;
        const start = scatter[id];
        const ambientRate = 1 + (id % 5) * .16;
        const ambientPhase = id * 1.73;
        const ambientX = Math.sin(ambientTime * ambientRate + ambientPhase) * (mobile ? 5.5 : 14) * ambientPresence;
        const ambientY = Math.cos(ambientTime * (ambientRate * .88) + ambientPhase * .7) * (mobile ? 4.5 : 11) * ambientPresence;
        let x = mix(start[0] * width, orbitX, organizing) + ambientX;
        let y = mix(start[1] * height, orbitY, organizing) + ambientY;
        const baseScale = mobile ? (depth === 0 ? .54 : .74) : [.62,.92,1.24][depth];
        const ambientScale = 1 + Math.sin(ambientTime * (ambientRate * 1.14) + ambientPhase) * .03 * ambientPresence;
        const scale = baseScale * mix(1, .60, shrinking) * mix(1, .04, absorption) * ambientScale;
        if (absorption < .05) [x, y] = keepTitleClear(x, y, 44 * scale, 38 * scale);
        const cardAngle = mix(((id % 5) - 2) * 4, orbitAngle * 180 / Math.PI * .12, organizing) + Math.sin(ambientTime * ambientRate + ambientPhase) * 3 * ambientPresence;
        record.group.setAttribute('transform', 'translate('+x.toFixed(2)+' '+y.toFixed(2)+') rotate('+cardAngle.toFixed(2)+') scale('+scale.toFixed(3)+')');
        const edge = clamp(Math.min(x+80,width+80-x,y+80,height+80-y)/75);
        const contrast = [ .42, .72, .96 ][depth];
        record.group.setAttribute('opacity', (edge * mix(contrast, .88, organizing) * dataPresence).toFixed(3));
        record.group.style.color = '#eeece6';
        record.ink.setAttribute('opacity', '1');
        record.ink.setAttribute('stroke-width', String([1,1.25,1.65][depth]));
        record.label.setAttribute('opacity', String(mix(.38, .62, organizing) * dataPresence));
      });
      product.style.opacity = String(mix(.72, 1, titleIntensity) * mix(1, .48, titleRelease));
      product.style.filter = 'brightness(' + (mix(.84, 1.08, titleIntensity) * mix(1, .88, titleRelease)).toFixed(3) + ')';
      product.style.textShadow = '0 0 20px rgba(245,243,239,' + (titleIntensity * (1-titleRelease) * .08).toFixed(3) + ')';
      signature.style.opacity = String(mix(.72, .94, titleIntensity) * mix(1, .40, titleRelease));
      intelligence.style.opacity = String(finalReveal);
      intelligence.style.transform = 'translate(-50%,-50%) scale(' + mix(.92,1,finalReveal).toFixed(3) + ')';
      intelligence.style.filter = 'brightness(' + mix(.86,1.08,finalReveal).toFixed(3) + ')';
      interactiveHero.dataset.cvProgress = progress.toFixed(3);
      interactiveHero.dataset.cvPhase = progress < .20 ? 'dispersao' : progress < .65 ? 'orbita' : progress < .92 ? 'convergencia' : 'ia-flow';
    }
    function tick(now) {
      frame = 0;
      if (!visible || paused || reduced || document.hidden) { last = 0; return; }
      const dt = last ? Math.min((now-last)/1000,.05) : 0;
      last = now; ambientTime += dt || 1/60; render(dt || 1/60);
      if (Math.abs(target-progress) > .0004 || progress < .65) frame = requestAnimationFrame(tick);
      else { progress = target; render(0); last = 0; }
    }
    function lifecycle() {
      const run = measured && visible && !paused && !reduced && !document.hidden && (Math.abs(target-progress) > .0004 || progress < .65);
      if (!run) { if (frame) cancelAnimationFrame(frame); frame = 0; last = 0; }
      else if (!frame) frame = requestAnimationFrame(tick);
    }
    pause.hidden = reduced;
    pause.addEventListener('click', () => {
      paused = !paused;
      pause.setAttribute('aria-pressed', String(paused));
      pause.setAttribute('aria-label', (paused ? 'Retomar' : 'Pausar') + ' animação do Hero');
      pause.querySelector('[data-cv-pause-label]').textContent = paused ? 'Retomar movimento' : 'Pausar movimento';
      pause.firstElementChild.textContent = paused ? '▶' : 'Ⅱ';
      lifecycle();
    });
    window.addEventListener('scroll', readScroll, { passive: true });
    window.addEventListener('resize', measure, { passive: true });
    document.addEventListener('visibilitychange', lifecycle);
    motionQuery.addEventListener('change', () => {
      reduced = motionQuery.matches; pause.hidden = reduced;
      measure(); lifecycle();
    });
    compactQuery.addEventListener('change', measure);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(() => readScroll(), { threshold: [0,.01,1] }).observe(sticky);
    }
    if ('ResizeObserver' in window) new ResizeObserver(measure).observe(sticky);
    measure();
    if (document.fonts) document.fonts.ready.then(measure);
    lifecycle();
  }

  /* AFLOR Flow demo video — activate sources only near the viewport. */
  const flowDemoVideo = document.querySelector('[data-aflor-flow-demo]');
  if (flowDemoVideo) {
    let flowDemoLoaded = false;

    function loadFlowDemoVideo() {
      if (flowDemoLoaded) return;
      flowDemoLoaded = true;

      flowDemoVideo.querySelectorAll('source[data-src]').forEach(source => {
        source.src = source.dataset.src;
      });

      flowDemoVideo.addEventListener('canplay', () => {
        flowDemoVideo.play().catch(() => {});
      }, { once: true });

      flowDemoVideo.load();
    }

    if ('IntersectionObserver' in window) {
      const flowDemoObserver = new IntersectionObserver(entries => {
        if (!entries[0].isIntersecting) return;
        loadFlowDemoVideo();
        flowDemoObserver.disconnect();
      }, { rootMargin: '400px 0px' });

      flowDemoObserver.observe(flowDemoVideo);
    } else {
      loadFlowDemoVideo();
    }

    function openFlowDemoFullscreen() {
      const requestFullscreen = flowDemoVideo.requestFullscreen || flowDemoVideo.webkitRequestFullscreen;
      if (!requestFullscreen) return;
      const fullscreenResult = requestFullscreen.call(flowDemoVideo);
      if (fullscreenResult && fullscreenResult.catch) fullscreenResult.catch(() => {});
    }

    flowDemoVideo.addEventListener('click', openFlowDemoFullscreen);
    flowDemoVideo.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      openFlowDemoFullscreen();
    });
  }
})();
