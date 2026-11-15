// Wirtualny spacer: przeglądarka panoram 360° (WebGL, bez bibliotek). Punkty, przejścia, opisy i plan w window.SPACER.
// Przejście między punktami: widok dojeżdża w stronę celu i płynnie przenika w nową panoramę (dwie tekstury mieszane w shaderze).
(function () {
  var S = window.SPACER, pole = document.getElementById('spacer'), cv = document.getElementById('spacer-plotno');
  if (!S || !pole || !cv) return;
  var gl = cv.getContext('webgl', { antialias: false });
  var info = document.getElementById('spacer-info');
  if (!gl) { info.textContent = 'Ta przeglądarka nie obsługuje podglądu 360°.'; pole.classList.add('spacer--bez'); return; }

  function shader(typ, kod) { var s = gl.createShader(typ); gl.shaderSource(s, kod); gl.compileShader(s); return s; }
  var pr = gl.createProgram();
  gl.attachShader(pr, shader(gl.VERTEX_SHADER, 'attribute vec2 p; varying vec2 v; void main(){ v = p; gl_Position = vec4(p, 0.0, 1.0); }'));
  gl.attachShader(pr, shader(gl.FRAGMENT_SHADER,
    'precision highp float; varying vec2 v; uniform sampler2D ta, tb; uniform vec3 a, b; uniform float asp, mieszaj;' +
    'vec3 widok(sampler2D t, vec3 k){ vec3 r = normalize(vec3(v.x * asp * k.z, v.y * k.z, 1.0));' +
    'float cp = cos(k.y), sp = sin(k.y); r = vec3(r.x, r.y * cp + r.z * sp, r.z * cp - r.y * sp);' +
    'float cy = cos(k.x), sy = sin(k.x); r = vec3(r.x * cy + r.z * sy, r.y, r.z * cy - r.x * sy);' +
    'return texture2D(t, vec2(atan(r.x, r.z) / 6.2831853 + 0.5, 0.5 - asin(clamp(r.y, -1.0, 1.0)) / 3.14159265)).rgb; }' +
    'void main(){ vec3 c = widok(ta, a); if (mieszaj > 0.001) c = mix(c, widok(tb, b), mieszaj); gl_FragColor = vec4(c, 1.0); }'));
  gl.linkProgram(pr); gl.useProgram(pr);
  var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  var ap = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(ap); gl.vertexAttribPointer(ap, 2, gl.FLOAT, false, 0, 0);
  var U = {}; ['ta', 'tb', 'a', 'b', 'asp', 'mieszaj'].forEach(function (n) { U[n] = gl.getUniformLocation(pr, n); });
  gl.uniform1i(U.ta, 0); gl.uniform1i(U.tb, 1);
  function nowaTekstura() {
    var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return t;
  }
  var tex = [nowaTekstura(), nowaTekstura()], biez = 0;       // tex[biez] = obecna panorama, druga czeka na następną

  var RAD = Math.PI / 180, FOV0 = 78 * RAD, yaw = 0, pitch = 0, fov = FOV0, akt = -1, gotowe = false, ruszone = false;
  var vy = 0, vp = 0, ciagnie = false, ost = 0, przej = null;
  var maly = gl.getParameter(gl.MAX_TEXTURE_SIZE) < 4096;
  var znaczniki = document.getElementById('spacer-znaczniki'), lista = document.getElementById('spacer-punkty');
  var plan = document.getElementById('spacer-plan'), stozek = document.getElementById('spacer-stozek');
  var bezRuchu = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var obrazy = {};
  function obraz(n, gotowy) {
    var p = S.punkty[n], im = obrazy[n];
    if (!im) { im = obrazy[n] = new Image(); im.src = maly ? p.maly : p.obraz; }
    if (!gotowy) return;
    if (im.complete && im.naturalWidth) gotowy(im); else im.addEventListener('load', function () { gotowy(im); }, { once: true });
  }
  // na dużym ekranie, gdy karta graficzna pozwala, po pokazaniu panoramy 4K doczytuje się wersja 8K i podmienia ją w locie
  var moze8k = gl.getParameter(gl.MAX_TEXTURE_SIZE) >= 8192 && window.matchMedia('(min-width: 900px) and (pointer: fine)').matches;
  function doostrz(n) {
    var p = S.punkty[n]; if (!moze8k || !p.duzy) return;
    var im = new Image();
    im.onload = function () { if (akt === n && !przej) { wgraj(biez, im); rysuj(); } };
    im.src = p.duzy;
  }
  function wgraj(ktora, im) {
    gl.activeTexture(ktora ? gl.TEXTURE1 : gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex[ktora]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, im);
  }
  function rozmiar() {
    var r = cv.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.round(r.width * d), h = Math.round(r.height * d);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); }
    return r;
  }
  function rysuj() {
    if (!gotowe) return;
    var r = rozmiar(), asp = r.width / r.height, tg = Math.tan(fov / 2);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex[biez]);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tex[1 - biez]);
    gl.uniform1f(U.asp, asp); gl.uniform3f(U.a, yaw, pitch, tg);
    if (przej) { gl.uniform3f(U.b, przej.yaw2, przej.pitch2, Math.tan(przej.fov2 / 2)); gl.uniform1f(U.mieszaj, przej.m); }
    else gl.uniform1f(U.mieszaj, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    Array.prototype.forEach.call(znaczniki.children, function (z) {
      var k = +z.dataset.yaw, p = +z.dataset.pitch;
      var x = Math.sin(k) * Math.cos(p), y = Math.sin(p), zz = Math.cos(k) * Math.cos(p);
      var cy = Math.cos(-yaw), sy = Math.sin(-yaw), x1 = x * cy + zz * sy, z1 = zz * cy - x * sy;
      var cp = Math.cos(-pitch), sp = Math.sin(-pitch), y2 = y * cp + z1 * sp, z2 = z1 * cp - y * sp;
      if (z2 <= 0.05) { z.hidden = true; return; }
      var sx = x1 / z2 / (tg * asp), syy = y2 / z2 / tg;
      z.hidden = Math.abs(sx) > 1.02 || Math.abs(syy) > 1.02;
      z.style.left = ((sx + 1) / 2 * 100) + '%'; z.style.top = ((1 - syy) / 2 * 100) + '%';
    });
    if (stozek) stozek.style.transform = 'translate(-50%, -50%) rotate(' + (yaw / RAD) + 'deg)';
  }
  function kierunek(p, x, y, z) {
    var dx = x - p.x, dw = -(y - p.y), odl = Math.sqrt(dx * dx + dw * dw) || 1;
    return [Math.atan2(dx, dw), Math.atan((z - 150) / odl)];
  }
  function opisz(n) {
    var p = S.punkty[n]; akt = n;
    znaczniki.innerHTML = '';
    S.punkty.forEach(function (q, k) {
      if (k === n || (p.do && p.do.indexOf(k) < 0)) return;
      var d = kierunek(p, q.x, q.y, 55);
      var b = document.createElement('button'); b.type = 'button'; b.className = 'spacer__przejscie'; b.textContent = q.nazwa;
      b.dataset.yaw = d[0]; b.dataset.pitch = Math.max(d[1], -0.5);
      b.addEventListener('click', function () { pokaz(k, d[0]); });
      znaczniki.appendChild(b);
      obraz(k);                                               // sąsiednie panoramy ładują się z wyprzedzeniem
    });
    (p.fakty || []).forEach(function (f) {
      var d = kierunek(p, f.x, f.y, f.z);
      var b = document.createElement('button'); b.type = 'button'; b.className = 'spacer__fakt'; b.setAttribute('aria-expanded', 'false');
      b.innerHTML = '<span class="spacer__fakt-znak" aria-hidden="true">i</span><span class="spacer__fakt-tekst">' + f.t + '</span>';
      b.dataset.yaw = d[0]; b.dataset.pitch = d[1];
      b.addEventListener('click', function () { b.setAttribute('aria-expanded', b.getAttribute('aria-expanded') !== 'true'); });
      znaczniki.appendChild(b);
    });
    Array.prototype.forEach.call(lista.children, function (b, k) { b.setAttribute('aria-pressed', k === n); });
    if (plan) Array.prototype.forEach.call(plan.querySelectorAll('[data-punkt]'), function (b) { b.setAttribute('aria-current', +b.dataset.punkt === n); });
    if (stozek) { stozek.style.left = (p.u * 100) + '%'; stozek.style.top = (p.v * 100) + '%'; }
    info.textContent = p.opis;
    doostrz(n);
  }
  function blisko(a, b) { var d = (a - b) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return b + d; }
  // n: punkt docelowy; wStrone: kierunek, w którym leży (kliknięta pigułka w kadrze) albo nic (lista, plan)
  function pokaz(n, wStrone) {
    if (n === akt || przej) return;
    var p = S.punkty[n];
    pole.classList.add('spacer--czeka');
    obraz(n, function (im) {
      pole.classList.remove('spacer--czeka');
      var cel = wStrone == null ? p.start * RAD : wStrone;
      if (akt < 0 || bezRuchu) {
        wgraj(biez, im); gotowe = true; yaw = cel; pitch = 0; fov = FOV0; vy = vp = 0; opisz(n); rysuj(); return;
      }
      wgraj(1 - biez, im);
      znaczniki.innerHTML = ''; vy = vp = 0;
      przej = { t0: 0, n: n, yaw0: yaw, pitch0: pitch, fov0: fov, cel: wStrone == null ? null : blisko(wStrone, yaw),
                yaw2: wStrone == null ? cel : blisko(wStrone, yaw), pitch2: 0, fov2: FOV0, m: 0, idzie: wStrone != null };
    });
  }
  function gladko(t) { return t * t * (3 - 2 * t); }
  function krokPrzejscia(t) {
    if (!przej.t0) przej.t0 = t;
    var czas = przej.idzie ? 1100 : 700, k = Math.min(1, (t - przej.t0) / czas), g = gladko(k);
    if (przej.idzie) {                                        // dojazd w stronę celu: obrót ku niemu i zbliżenie, potem przenikanie
      yaw = przej.yaw0 + (przej.cel - przej.yaw0) * gladko(Math.min(1, k * 1.6));
      pitch = przej.pitch0 * (1 - g);
      fov = przej.fov0 * (1 - 0.42 * g);
      przej.fov2 = FOV0 * (1.28 - 0.28 * g);
      przej.m = gladko(Math.max(0, Math.min(1, (k - 0.3) / 0.7)));
    } else przej.m = g;
    rysuj();
    if (k >= 1) {
      biez = 1 - biez; yaw = przej.yaw2; pitch = przej.pitch2; fov = FOV0;
      var n = przej.n; przej = null; opisz(n); rysuj();
    }
  }
  S.punkty.forEach(function (p, k) {
    var b = document.createElement('button'); b.type = 'button'; b.textContent = p.nazwa; b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', function () { pokaz(k); }); lista.appendChild(b);
    if (plan) {
      var m = document.createElement('button'); m.type = 'button'; m.className = 'spacer__plan-punkt'; m.dataset.punkt = k;
      m.style.left = (p.u * 100) + '%'; m.style.top = (p.v * 100) + '%'; m.setAttribute('aria-label', p.nazwa); m.title = p.nazwa;
      m.addEventListener('click', function () { pokaz(k); }); plan.appendChild(m);
    }
  });

  // ruch: przeciąganie z wybiegiem, powolny obrót do pierwszego dotknięcia, przybliżanie
  function ogranicz() { pitch = Math.max(-1.25, Math.min(1.25, pitch)); fov = Math.max(52 * RAD, Math.min(95 * RAD, fov)); }
  function dotkniete() { if (!ruszone) { ruszone = true; pole.classList.add('spacer--ruszony'); } }
  function tyka(t) {
    var dt = Math.min(50, t - ost || 16); ost = t;
    if (przej) krokPrzejscia(t);
    else if (!ciagnie && gotowe) {
      if (!ruszone && !bezRuchu) { yaw += 0.00006 * dt; rysuj(); }
      else if (Math.abs(vy) > 0.00002 || Math.abs(vp) > 0.00002) { yaw += vy * dt; pitch += vp * dt; vy *= 0.93; vp *= 0.93; ogranicz(); rysuj(); }
    }
    requestAnimationFrame(tyka);
  }
  var px = 0, py = 0, pt = 0;
  cv.addEventListener('pointerdown', function (e) { if (przej) return; ciagnie = true; px = e.clientX; py = e.clientY; pt = e.timeStamp; vy = vp = 0; cv.setPointerCapture(e.pointerId); dotkniete(); });
  cv.addEventListener('pointermove', function (e) {
    if (!ciagnie || przej) return;
    var r = cv.getBoundingClientRect(), k = fov / r.height, dt = Math.max(1, e.timeStamp - pt);
    var dy = -(e.clientX - px) * k, dp = (e.pointerType === 'mouse' || pole.classList.contains('spacer--pelny')) ? (e.clientY - py) * k : 0;
    yaw += dy; pitch += dp; vy = dy / dt; vp = dp / dt; px = e.clientX; py = e.clientY; pt = e.timeStamp; ogranicz(); rysuj();
  });
  ['pointerup', 'pointercancel'].forEach(function (n) { cv.addEventListener(n, function () { ciagnie = false; }); });
  cv.addEventListener('wheel', function (e) { if (przej || (!e.ctrlKey && !pole.classList.contains('spacer--pelny'))) return; e.preventDefault(); fov += e.deltaY * 0.0012; ogranicz(); rysuj(); dotkniete(); }, { passive: false });
  cv.addEventListener('keydown', function (e) {
    var d = { ArrowLeft: [-0.12, 0, 0], ArrowRight: [0.12, 0, 0], ArrowUp: [0, 0.08, 0], ArrowDown: [0, -0.08, 0], '+': [0, 0, -0.1], '=': [0, 0, -0.1], '-': [0, 0, 0.1] }[e.key];
    if (!d || przej) return; e.preventDefault(); yaw += d[0]; pitch += d[1]; fov += d[2]; ogranicz(); rysuj(); dotkniete();
  });
  Array.prototype.forEach.call(pole.querySelectorAll('[data-zoom]'), function (b) {
    b.addEventListener('click', function () { if (przej) return; fov += +b.dataset.zoom * RAD; ogranicz(); rysuj(); dotkniete(); });
  });
  var pe = pole.querySelector('[data-pelny]');
  function pelny(tak) { pole.classList.toggle('spacer--pelny', tak); document.documentElement.classList.toggle('spacer-otwarty', tak); if (pe) pe.textContent = tak ? 'Zamknij' : 'Pełny ekran'; setTimeout(rysuj, 60); }
  if (pe) pe.addEventListener('click', function () {
    var tak = !pole.classList.contains('spacer--pelny');
    if (tak && pole.requestFullscreen) pole.requestFullscreen().catch(function () {});
    else if (!tak && document.fullscreenElement) document.exitFullscreen();
    pelny(tak);
  });
  document.addEventListener('fullscreenchange', function () { if (!document.fullscreenElement) pelny(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && pole.classList.contains('spacer--pelny')) pelny(false); });
  window.addEventListener('resize', rysuj);
  requestAnimationFrame(tyka);
  setTimeout(function () { pole.classList.add('spacer--ruszony'); }, 7000);   // podpowiedź znika sama, obrót trwa do pierwszego dotknięcia
  pokaz(0);
})();
