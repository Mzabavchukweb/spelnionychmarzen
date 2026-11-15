(function () {
  var T = window.TYPY, DOMY = window.DOMY, MK = window.MAKIETA, ST = window.STATUSY;
  var MAIL = 'osiedle@spelnionychmarzen.pl';
  var KOLEJNOSC = ['A1', 'A', 'B', 'C'];

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function znajdz(id) { return DOMY.filter(function (d) { return d.id === id; })[0]; }
  function cena(d) { return T[d.typ].pow * window.CENA_M2; }
  function nr(d, cls) { var s = el('span', 'nr' + (cls ? ' ' + cls : ''), d.id); s.dataset.status = d.status; return s; }
  function m2(n) { return window.m2(n).replace(' m²', ' m²'); }

  var wolne = DOMY.filter(function (d) { return d.status === 'wolny'; }).length;
  document.querySelectorAll('[data-wolne]').forEach(function (e) { e.textContent = wolne; });
  var od = Math.min.apply(null, DOMY.filter(function (d) { return d.status === 'wolny'; }).map(cena));
  document.querySelectorAll('[data-cena-od]').forEach(function (e) { e.textContent = window.zl(od); });
  var doo = Math.max.apply(null, DOMY.filter(function (d) { return d.status === 'wolny'; }).map(cena));
  document.querySelectorAll('[data-cena-do]').forEach(function (e) { e.textContent = window.zl(doo); });
  document.querySelectorAll('[data-sprzedane]').forEach(function (e) { e.textContent = DOMY.filter(function (d) { return d.status === 'sprzedany'; }).length; });

  // Menu na telefonie
  var menu = document.getElementById('menu'), mp = document.querySelector('.menu-przycisk');
  var nag = document.querySelector('.naglowek');
  // Nagłówek przezroczysty na zdjęciu, biały po przewinięciu albo przy otwartym menu
  function stanNaglowka() { nag.classList.toggle('naglowek--pelny', window.scrollY > 24 || menu.classList.contains('otwarte')); }
  window.addEventListener('scroll', stanNaglowka, { passive: true });
  stanNaglowka();
  // Na telefonie nagłówek chowa się przy przewijaniu w dół i wraca przy przewijaniu w górę
  var ostY = window.scrollY;
  window.addEventListener('scroll', function () {
    var y = window.scrollY, wDol = y > ostY + 4, wGore = y < ostY - 4;
    if (wDol && y > 200 && !menu.classList.contains('otwarte')) nag.classList.add('naglowek--schowany');
    else if (wGore || y <= 200) nag.classList.remove('naglowek--schowany');
    ostY = y;
  }, { passive: true });
  nag.addEventListener('focusin', function () { nag.classList.remove('naglowek--schowany'); });
  // Pływający przycisk „Zadzwoń”: pojawia się po hero, znika przy sekcji kontaktu i stopce
  var dzwon = document.querySelector('.dzwon'), przyKontakcie = false;
  function stanDzwon() { if (dzwon) dzwon.classList.toggle('dzwon--widac', window.scrollY > window.innerHeight * 0.6 && !przyKontakcie); }
  window.addEventListener('scroll', stanDzwon, { passive: true });
  if ('IntersectionObserver' in window) {
    var widziane = {};
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { widziane[e.target.id || 'stopka'] = e.isIntersecting; });
      przyKontakcie = Object.keys(widziane).some(function (k) { return widziane[k]; }); stanDzwon();
    }, { threshold: 0.15 });
    [document.getElementById('kontakt'), document.querySelector('.stopka')].forEach(function (e) { if (e) io.observe(e); });
  }
  stanDzwon();

  // Pytania: na komputerze odpowiedzi zawsze otwarte, na telefonie rozwijane
  var pyt = document.querySelectorAll('.pytania details'), mqTel = window.matchMedia('(max-width: 760px)');
  function stanPytan() { pyt.forEach(function (d) { d.open = !mqTel.matches; d.querySelector('summary').tabIndex = mqTel.matches ? 0 : -1; }); }
  mqTel.addEventListener('change', stanPytan); stanPytan();
  pyt.forEach(function (d) { d.querySelector('summary').addEventListener('click', function (e) { if (!mqTel.matches) e.preventDefault(); }); });

  function ustawMenu(o) {
    menu.classList.toggle('otwarte', o); mp.setAttribute('aria-expanded', o); mp.textContent = o ? 'Zamknij' : 'Menu';
    document.documentElement.classList.toggle('menu-otwarte', o); stanNaglowka();
  }
  mp.addEventListener('click', function () { ustawMenu(!menu.classList.contains('otwarte')); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) ustawMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('otwarte')) { ustawMenu(false); mp.focus(); } });
  window.matchMedia('(min-width: 961px)').addEventListener('change', function (e) { if (e.matches) ustawMenu(false); });

  // Nawigator: obrysy połówek na makiecie 3D i tabliczki z numerami domów (jak numer 6B przy furtce)
  var NS = 'http://www.w3.org/2000/svg';
  var svg = document.getElementById('nav-svg'), lista = document.getElementById('lista'), karta = document.getElementById('karta');
  function s(tag, attrs) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }
  // Makieta ma dwa widoki: poziomy na komputer i pionowy na telefon (cała mieści się na ekranie, bez przewijania w bok).
  var mqMak = window.matchMedia('(max-width: 960px)'), wybrany = null;
  function rysujMakiete() {
    var pion = mqMak.matches && window.MAKIETA_PION, dane = pion ? window.MAKIETA_PION.domy : MK, wym = pion ? window.MAKIETA_PION.wym : window.MAKIETA_WYM;
    var szer = svg.getBoundingClientRect().width || 360;      // tabliczka ma mieć na ekranie co najmniej 17 px wysokości
    var skala = Math.min(2.2, Math.max(1, 17 / (58 * szer / wym[0])));
    svg.textContent = ''; svg.setAttribute('viewBox', '0 0 ' + wym[0] + ' ' + wym[1]);
    var piny = s('g', { 'class': 'piny' });
    DOMY.forEach(function (d) {
    var m = dane[d.id];
    var g = s('g', { 'class': 'dom', 'data-id': d.id, 'data-status': d.status, tabindex: '0', role: 'button', 'aria-pressed': 'false',
      'aria-label': 'Dom ' + d.id + ', typ ' + d.typ + ', ' + ST[d.status].toLowerCase() });
    g.appendChild(s('path', { d: m.d, 'class': 'dom__obrys' }));
    g.addEventListener('click', function () { wybierz(d.id); });
    g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); wybierz(d.id); } });
    svg.appendChild(g);
    // tabliczka: pole, wcięta biała ramka, numer
    var w = 38 + d.id.length * 24, h = 58;
    var p = s('g', { 'class': 'pin', 'data-id': d.id, 'data-status': d.status, transform: 'translate(' + m.pin[0] + ' ' + m.pin[1] + ') scale(' + skala + ')', 'aria-hidden': 'true' });
    p.appendChild(s('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: h / 2, 'class': 'pin__pole' }));
    p.appendChild(s('rect', { x: -w / 2 + 6, y: -h / 2 + 6, width: w - 12, height: h - 12, rx: 6, 'class': 'pin__ramka' }));
    var tx = s('text', { y: 12.5, 'class': 'pin__nr' }); tx.textContent = d.id; p.appendChild(tx);
    piny.appendChild(p);
    });
    svg.appendChild(piny);
  }
  DOMY.forEach(function (d) {
    var tr = el('tr'); tr.dataset.id = d.id; tr.dataset.status = d.status;
    var td = el('td'), wb = el('button', 'wybierz'); wb.type = 'button';
    wb.setAttribute('aria-label', 'Pokaż dom ' + d.id); wb.appendChild(nr(d));
    wb.addEventListener('click', function () { wybierz(d.id); });
    td.appendChild(wb); tr.appendChild(td);
    tr.insertAdjacentHTML('beforeend',
      '<td class="typ-k">' + d.typ + '</td><td class="l">' + m2(T[d.typ].pow) + '</td><td class="l sypialnie">' + T[d.typ].sypialnie +
      '</td><td class="l">' + (d.status === 'sprzedany' ? '<span class="tylko-tel">Sprzedany</span>' : window.zl(cena(d)).replace(/ /g, '\u00a0')) +
      '</td><td class="status-k">' + ST[d.status] + '</td>');
    lista.appendChild(tr);
  });
  rysujMakiete();

  // Filtry typu i statusu
  var filtr = { typ: '', status: '' };
  function zastosuj() {
    DOMY.forEach(function (d) {
      var ok = (!filtr.typ || d.typ === filtr.typ) && (!filtr.status || d.status === filtr.status);
      svg.querySelectorAll('[data-id="' + d.id + '"]').forEach(function (e) { e.classList.toggle('poza', !ok); });
      lista.querySelector('tr[data-id="' + d.id + '"]').hidden = !ok;
    });
    document.querySelectorAll('#filtr-typ button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.typ === filtr.typ); });
    document.querySelectorAll('#filtr-status button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.status === filtr.status); });
  }
  document.querySelectorAll('#filtr-typ button').forEach(function (b) { b.addEventListener('click', function () { filtr.typ = b.dataset.typ; zastosuj(); }); });
  document.querySelectorAll('#filtr-status button').forEach(function (b) { b.addEventListener('click', function () { filtr.status = b.dataset.status; zastosuj(); }); });
  window.filtrujTyp = function (k) { filtr.typ = k; filtr.status = ''; zastosuj(); };

  function wybierz(id) {
    var d = znajdz(id), t = T[d.typ]; wybrany = id;
    svg.querySelectorAll('.dom').forEach(function (g) { g.setAttribute('aria-pressed', g.getAttribute('data-id') === id); });
    svg.querySelectorAll('.pin').forEach(function (p) { p.classList.toggle('akt', p.getAttribute('data-id') === id); });
    lista.querySelectorAll('tr').forEach(function (r) { if (r.dataset.id === id) r.setAttribute('aria-current', 'true'); else r.removeAttribute('aria-current'); });

    var baza = (window.SM_BAZA || ''), wolny = d.status !== 'sprzedany';
    karta.dataset.status = d.status;
    karta.innerHTML =
      '<img class="karta__rys" width="1243" height="675" src="' + baza + 'img/elewacja-' + d.typ.toLowerCase() + '.webp" alt="Elewacja frontowa budynku typu ' + d.typ + '">' +
      '<p class="karta__nr">Dom ' + d.id + '</p>' +
      '<p class="karta__cena">' + (wolny ? window.zl(cena(d)) : 'Sprzedany') + '</p>' +
      '<dl class="karta__dane">' +
      '<div><dt>Typ</dt><dd>' + d.typ + '</dd></div>' +
      '<div><dt>Powierzchnia z garażem</dt><dd>' + m2(t.pow) + '</dd></div>' +
      '<div><dt>Sypialnie</dt><dd>' + t.sypialnie + '</dd></div>' +
      '<div><dt>Działka</dt><dd>ok. 500\u00a0m²</dd></div>' +
      '<div><dt>Status</dt><dd>' + ST[d.status] + '</dd></div></dl>';
    var a = el('p', 'akcje');
    if (wolny) {
      var z = el('a', 'przycisk', 'Zapytaj o dom ' + d.id);
      z.href = 'mailto:' + MAIL + '?subject=' + encodeURIComponent('Dom ' + d.id + ', ul. Spełnionych Marzeń');
      a.appendChild(z);
    }
    var rz = el('a', 'przycisk przycisk--jasny', 'Rzuty typu ' + d.typ); rz.href = '#typy';
    rz.addEventListener('click', function () { pokazTyp(d.typ); });
    a.appendChild(rz);
    karta.appendChild(a);
  }
  wybierz(DOMY.filter(function (d) { return d.status === 'wolny'; })[0].id);
  mqMak.addEventListener('change', function () { rysujMakiete(); zastosuj(); if (wybrany) wybierz(wybrany); });

  // Typy domów: zakładki, przełącznik parter / piętro, tabela pomieszczeń
  var zak = document.getElementById('zakladki'), opis = document.getElementById('typ-opis'), rzut = document.getElementById('rzut');
  var typ = 'A1', kond = 'elewacja';
  KOLEJNOSC.forEach(function (k) {
    var b = el('button', 'zakladka', 'Typ ' + k);
    b.type = 'button'; b.id = 'z-' + k; b.dataset.typ = k;
    b.setAttribute('role', 'tab'); b.setAttribute('aria-controls', 'typ');
    b.addEventListener('click', function () { pokazTyp(k); });
    zak.appendChild(b);
  });
  zak.addEventListener('keydown', function (e) {
    var i = KOLEJNOSC.indexOf(e.target.closest('.zakladka') ? e.target.closest('.zakladka').dataset.typ : typ), n = null;
    if (e.key === 'ArrowRight') n = (i + 1) % 4; else if (e.key === 'ArrowLeft') n = (i + 3) % 4;
    if (n !== null) { e.preventDefault(); pokazTyp(KOLEJNOSC[n]); document.getElementById('z-' + KOLEJNOSC[n]).focus(); }
  });
  document.querySelectorAll('.przelacznik button').forEach(function (b) {
    b.addEventListener('click', function () { kond = b.dataset.k; rysujTyp(); });
  });

  function pokazTyp(k) { typ = k; rysujTyp(); }
  function rysujTyp() {
    var t = T[typ];
    zak.querySelectorAll('.zakladka').forEach(function (b) {
      var s = b.dataset.typ === typ; b.setAttribute('aria-selected', s); b.tabIndex = s ? 0 : -1;
    });
    document.getElementById('typ').setAttribute('aria-labelledby', 'z-' + typ);
    document.querySelectorAll('.przelacznik button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.k === kond); });
    var baza = (window.SM_BAZA || ''), elew = kond === 'elewacja', mt = typ.toLowerCase();
    rzut.classList.toggle('elew', elew);
    var wym = {"a": {"elewacja": [1156, 628], "parter": [1800, 1601], "pietro": [1800, 1601]}, "a1": {"elewacja": [1243, 675], "parter": [1800, 1351], "pietro": [1800, 1351]}, "b": {"elewacja": [1257, 584], "parter": [1800, 1309], "pietro": [1800, 1309]}, "c": {"elewacja": [1438, 642], "parter": [1800, 1228], "pietro": [1800, 1228]}}[mt][kond]; rzut.width = wym[0]; rzut.height = wym[1];
    rzut.src = baza + (elew ? 'img/elewacja-' + mt + '.webp' : 'img/rzut-' + mt + '-' + kond + '.webp');
    rzut.alt = elew ? 'Elewacja frontowa budynku typu ' + typ + ', rysunek z projektu'
      : 'Rzut ' + (kond === 'parter' ? 'parteru' : 'piętra') + ' budynku typu ' + typ + ', obie połowy bliźniaka';

    var domy = DOMY.filter(function (d) { return d.typ === typ; });
    var lista = elew ? [['Parter', t.parterRazem], ['Piętro', t.pietroRazem]] : t[kond];
    var rows = lista.map(function (r) { return '<tr><td>' + r[0] + '</td><td>' + m2(r[1]) + '</td></tr>'; }).join('');
    opis.innerHTML =
      '<div class="typ__pow">' + m2(t.pow) + '<small>powierzchnia domu z garażem, ' + t.sypialnie + ' sypialnie</small></div>' +
      '<table class="pomieszczenia"><caption>' + (elew ? 'Kondygnacje' : kond === 'parter' ? 'Parter' : 'Piętro') + '</caption><tbody>' + rows +
      '</tbody><tfoot><tr><td>Razem</td><td>' + m2(elew ? t.pow : t[kond + 'Razem']) + '</td></tr></tfoot></table>' +
      '<p class="typ__pdf"><a href="' + baza + 'pdf/typ-' + mt + '-parter.pdf" target="_blank" rel="noopener">Rzut parteru (PDF)</a><a href="' + baza + 'pdf/typ-' + mt + '-pietro.pdf" target="_blank" rel="noopener">Rzut piętra (PDF)</a><a href="' + baza + 'typ-' + mt + '.html">Typ ' + typ + ': przekrój, elewacje i wszystkie rysunki &rarr;</a>' + (typ === 'B' ? '<a href="' + baza + 'spacer.html">Wirtualny spacer po parterze &rarr;</a>' : '') + '</p>' +
      '<p class="przypis">Domy tego typu na osiedlu:</p>';
    var g = el('div', 'typ__domy'); domy.forEach(function (d) { g.appendChild(nr(d)); }); opis.appendChild(g);
  }
  rysujTyp();

  // Pasma ze zdjęciami: lekka paralaksa przy przewijaniu
  var pasma = Array.prototype.slice.call(document.querySelectorAll('[data-paralaksa]'));
  var ruch = window.matchMedia('(prefers-reduced-motion: no-preference)');
  var czeka = false;
  function paralaksa() {
    czeka = false;
    pasma.forEach(function (img) {
      var r = img.parentNode.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      var p = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight;
      img.style.transform = 'translate3d(0,' + (p * -7).toFixed(2) + '%,0)';
    });
  }
  if (ruch.matches && pasma.length) {
    window.addEventListener('scroll', function () { if (!czeka) { czeka = true; requestAnimationFrame(paralaksa); } }, { passive: true });
    paralaksa();
  }

  // Zdjęcia z budowy: duże zdjęcie, miniatury, powiększenie
  var dlg = document.getElementById('foto'), fimg = document.getElementById('foto-img'), fnr = document.getElementById('foto-nr');
  var fotki = Array.prototype.slice.call(document.querySelectorAll('[data-foto]')), akt = 0;
  var bimg = document.getElementById('budowa-img'), bpod = document.getElementById('budowa-podpis'), bnr = document.getElementById('budowa-nr');
  function wybierzFoto(i, przewin) {
    akt = (i + fotki.length) % fotki.length;
    var a = fotki[akt], m = a.querySelector('img');
    // od razu miniatura (już wczytana), duży plik podmienia ją, gdy się wczyta
    bimg.src = m.currentSrc || m.src; bimg.alt = m.alt;
    var duzy = new Image(), ktory = akt;
    duzy.onload = function () { if (akt === ktory) bimg.src = duzy.src; };
    duzy.src = a.href; bpod.textContent = a.dataset.podpis; bnr.textContent = (akt + 1) + ' / ' + fotki.length;
    fotki.forEach(function (f, k) { if (k === akt) f.setAttribute('aria-current', 'true'); else f.removeAttribute('aria-current'); });
    if (przewin) { var k = a.parentNode; k.scrollTo({ left: a.offsetLeft - k.offsetLeft - (k.clientWidth - a.clientWidth) / 2, behavior: ruch.matches ? 'smooth' : 'auto' }); }
  }
  function pokaz(i) {
    wybierzFoto(i, true);
    fimg.src = fotki[akt].href; fimg.alt = fotki[akt].querySelector('img').alt;
    fnr.textContent = (akt + 1) + ' / ' + fotki.length;
  }
  fotki.forEach(function (a, i) { a.addEventListener('click', function (e) { e.preventDefault(); wybierzFoto(i, false); }); });
  document.querySelectorAll('[data-przewin]').forEach(function (b) {
    b.addEventListener('click', function () { wybierzFoto(akt + Number(b.dataset.przewin), true); });
  });
  wybierzFoto(0, false);
  var pow = document.getElementById('rzut-powieksz');
  if (pow && typeof dlg.showModal === 'function') pow.addEventListener('click', function () {
    dlg.classList.add('foto--jeden'); fimg.src = rzut.src; fimg.alt = rzut.alt; fnr.textContent = ''; dlg.showModal();
  });
  if (typeof dlg.showModal === 'function') {
    document.getElementById('budowa-powieksz').addEventListener('click', function () { dlg.classList.remove('foto--jeden'); pokaz(akt); dlg.showModal(); });
    dlg.addEventListener('click', function (e) {
      if (e.target.dataset.krok && !dlg.classList.contains('foto--jeden')) pokaz(akt + Number(e.target.dataset.krok));
      else if (e.target.hasAttribute('data-zamknij') || e.target === dlg) dlg.close();
    });
    dlg.addEventListener('keydown', function (e) {
      if (dlg.classList.contains('foto--jeden')) return;
      if (e.key === 'ArrowRight') pokaz(akt + 1); else if (e.key === 'ArrowLeft') pokaz(akt - 1);
    });
  }
})();
