(() => {
  const header = document.querySelector('.site-header');
  const button = header?.querySelector('.prime-mobile-toggle');
  const nav = header?.querySelector('#prime-mobile-nav');
  if (!button || !nav) return;

  const mobile = window.matchMedia('(max-width: 860px)');

  function setOpen(open) {
    nav.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  }

  button.addEventListener('click', () => {
    if (mobile.matches) setOpen(nav.hidden);
  });

  document.addEventListener('click', (event) => {
    if (nav.hidden || button.contains(event.target)) return;

    if (nav.contains(event.target)) {
      if (event.target.closest('a[href]')) {
        button.focus({ preventScroll: true });
        setOpen(false);
      }
    } else {
      if (nav.contains(document.activeElement)) button.focus({ preventScroll: true });
      setOpen(false);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || nav.hidden) return;
    button.focus({ preventScroll: true });
    setOpen(false);
  });

  mobile.addEventListener('change', () => {
    if (!mobile.matches) {
      if (nav.contains(document.activeElement) || document.activeElement === button) {
        header.querySelector('.header-brand')?.focus({ preventScroll: true });
      }
      setOpen(false);
    }
  });

  header.setAttribute('data-prime-mobile-nav', '');

  // Reposition direct mobile arrivals after the Home layout has loaded.
  const initialHash = window.location.hash;
  if (mobile.matches && ['#evento', '#diagnostico', '#prime-council'].includes(initialHash)) {
    const section = document.getElementById(initialHash.slice(1));
    if (section) {
      window.addEventListener('load', () => {
        if (window.location.hash === initialHash && mobile.matches) {
          section.scrollIntoView({ behavior: 'instant', block: 'start' });
        }
      }, { once: true });
    }
  }
})();
