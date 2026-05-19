/* ============================================================
   PRIME COUNCIL · ECOSSISTEMA EXECUTIVO
   scripts.js — Interações e comportamentos da landing page
   ============================================================ */

/* ============================================================
   1. INICIALIZAÇÃO
   ============================================================ */
document.addEventListener('DOMContentLoaded', function () {
  initSmoothScroll();
  initHeaderScroll();
});

/* ============================================================
   2. SCROLL SUAVE — âncoras internas
   ============================================================ */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var target = document.querySelector(this.getAttribute('href'));
      if (!target) return;

      e.preventDefault();

      var header = document.querySelector('.site-header');
      var headerOffset = header ? header.offsetHeight + 8 : 68;
      var elementPosition = target.getBoundingClientRect().top;
      var offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    });
  });
}

/* ============================================================
   3. HEADER — comportamento ao rolar
   Adiciona classe .scrolled para ajuste visual futuro (sombra, etc.)
   ============================================================ */
function initHeaderScroll() {
  var header = document.querySelector('.site-header');
  if (!header) return;

  window.addEventListener('scroll', function () {
    if (window.pageYOffset > 80) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }, { passive: true });
}

/* ============================================================
   4. HERO
   Conteúdo crítico permanece visível imediatamente em mobile e renderizações lentas.
   ============================================================ */
/* ============================================================
   5. RASTREAMENTO DE CTAs (placeholder)
   Descomente e adapte ao seu sistema de analytics (GA4, GTM, etc.)
   ============================================================ */
/*
function trackCTA(label) {
  if (typeof gtag === 'function') {
    gtag('event', 'cta_click', {
      event_category: 'CTA',
      event_label: label
    });
  }
}

document.querySelectorAll('.btn-gold, .btn-primary').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var label = this.textContent.trim().substring(0, 60);
    trackCTA(label);
  });
});
*/

/* ============================================================
   6. URGÊNCIA / CONTAGEM REGRESSIVA (placeholder)
   Ativar quando a seção #urgencia for implementada.
   ============================================================ */
/*
function initCountdown(targetDateStr) {
  var target = new Date(targetDateStr).getTime();

  var interval = setInterval(function () {
    var now = Date.now();
    var diff = target - now;

    if (diff <= 0) {
      clearInterval(interval);
      return;
    }

    var days    = Math.floor(diff / 86400000);
    var hours   = Math.floor((diff % 86400000) / 3600000);
    var minutes = Math.floor((diff % 3600000)  / 60000);
    var seconds = Math.floor((diff % 60000)    / 1000);

    var el = document.querySelector('.countdown-display');
    if (el) {
      el.textContent = days + 'd ' + hours + 'h ' + minutes + 'm ' + seconds + 's';
    }
  }, 1000);
}

// initCountdown('2026-06-26T09:00:00-03:00');
*/
