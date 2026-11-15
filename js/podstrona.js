// Podstrony: menu na telefonie, nagłówek chowany przy przewijaniu w dół, powiększanie rysunków i zdjęć
(function () {
  var menu = document.getElementById('menu'), mp = document.querySelector('.menu-przycisk'), nag = document.querySelector('.naglowek');
  function ustawMenu(o) {
    menu.classList.toggle('otwarte', o); mp.setAttribute('aria-expanded', o); mp.textContent = o ? 'Zamknij' : 'Menu';
    document.documentElement.classList.toggle('menu-otwarte', o);
  }
  mp.addEventListener('click', function () { ustawMenu(!menu.classList.contains('otwarte')); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) ustawMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('otwarte')) { ustawMenu(false); mp.focus(); } });
  window.matchMedia('(min-width: 961px)').addEventListener('change', function (e) { if (e.matches) ustawMenu(false); });

  // Podstrona z ciemną górą: nagłówek przezroczysty na górze, biały po przewinięciu albo przy otwartym menu
  if (document.body.classList.contains('pod--ciemna')) {
    var stanNag = function () { nag.classList.toggle('naglowek--pelny', window.scrollY > 24 || menu.classList.contains('otwarte')); };
    window.addEventListener('scroll', stanNag, { passive: true }); mp.addEventListener('click', stanNag); menu.addEventListener('click', stanNag); stanNag();
  }

  var ostY = window.scrollY;
  window.addEventListener('scroll', function () {
    var y = window.scrollY;
    if (y > ostY + 4 && y > 200 && !menu.classList.contains('otwarte')) nag.classList.add('naglowek--schowany');
    else if (y < ostY - 4 || y <= 200) nag.classList.remove('naglowek--schowany');
    ostY = y;
  }, { passive: true });
  nag.addEventListener('focusin', function () { nag.classList.remove('naglowek--schowany'); });

  var dlg = document.getElementById('foto'), fotki = Array.prototype.slice.call(document.querySelectorAll('[data-foto]'));
  if (!dlg || !fotki.length || !dlg.showModal) return;
  var img = document.getElementById('foto-img'), nr = document.getElementById('foto-nr'), akt = 0;
  function pokaz(k) {
    akt = (k + fotki.length) % fotki.length;
    var f = fotki[akt];
    img.src = f.getAttribute('data-foto'); img.alt = f.getAttribute('data-podpis') || '';
    nr.textContent = (f.getAttribute('data-podpis') || '') + (fotki.length > 1 ? '  ' + (akt + 1) + ' / ' + fotki.length : '');
  }
  fotki.forEach(function (f, k) { f.addEventListener('click', function (e) { e.preventDefault(); pokaz(k); dlg.showModal(); }); });
  dlg.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (b && b.hasAttribute('data-zamknij') || e.target === dlg) dlg.close();
    else if (b && b.dataset.krok) pokaz(akt + (+b.dataset.krok));
  });
  dlg.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') pokaz(akt + 1); if (e.key === 'ArrowLeft') pokaz(akt - 1); });
  if (fotki.length < 2) dlg.querySelectorAll('[data-krok]').forEach(function (b) { b.hidden = true; });
})();

// Powiększenie zdjęć: przesunięcie palcem w bok zmienia zdjęcie (działa przez przyciski „poprzednie / następne”)
(function () {
  var d = document.getElementById('foto'); if (!d) return;
  var x0 = null, y0 = 0;
  d.addEventListener('touchstart', function (e) { if (e.touches.length === 1) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; } else x0 = null; }, { passive: true });
  d.addEventListener('touchend', function (e) {
    if (x0 === null || d.classList.contains('foto--jeden')) return;
    var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
    if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    var b = d.querySelector('[data-krok="' + (dx < 0 ? 1 : -1) + '"]'); if (b && !b.hidden) b.click();
  }, { passive: true });
})();
