(function () {
  'use strict';

  var year = document.getElementById('current-year');
  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  var topButton = document.querySelector('.back-to-top');
  if (!topButton) return;

  function toggleTopButton() {
    topButton.classList.toggle('is-visible', window.scrollY > 520);
  }

  topButton.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  window.addEventListener('scroll', toggleTopButton, { passive: true });
  toggleTopButton();
}());
