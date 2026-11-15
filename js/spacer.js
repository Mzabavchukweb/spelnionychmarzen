// Wirtualny spacer: przeglądarka panoram 360° (WebGL, bez bibliotek). Punkty, przejścia, opisy i plan w window.SPACER.
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
    'precision highp float; varying vec2 v; uniform sampler2D t; uniform float yaw, pitch, tg, asp;' +
    'void main(){ vec3 r = normalize(vec3(v.x * asp * tg, v.y * tg, 1.0));' +
    'float cp = cos(pitch), sp = sin(pitch); r = vec3(r.x, r.y * cp + r.z * sp, r.z * cp - r.y * sp);' +
    'float cy = cos(yaw), sy = sin(yaw); r = vec3(r.x * cy + r.z * sy, r.y, r.z * cy - r.x * sy);' +
    'float lon = atan(r.x, r.z), lat = asin(clamp(r.y, -1.0, 1.0));' +
    'gl_FragColor = texture2D(t, vec2(lon / 6.2831853 + 0.5, 0.5 - lat / 3.14159265)); }'));
  gl.linkProgram(pr); gl.useProgram(pr);
  var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  var ap = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(ap); gl.vertexAttribPointer(ap, 2, gl.FLOAT, false, 0, 0);
  var U = {}; ['yaw', 'pitch', 'tg', 'asp'].forEach(function (n) { U[n] = gl.getUniformLocation(pr, n); });
  var tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  var RAD = Math.PI / 180, yaw = 0, pitch = 0, fov = 78 * RAD, akt = -1, gotowe = false, ruszone = false;
  var vy = 0, vp = 0, ciagnie = false, klatka = 0, ost = 0;
  var maly = gl.getParameter(gl.MAX_TEXTURE_SIZE) < 4096;
  var znaczniki = document.getElementById('spacer-znaczniki'), lista = document.getElementById('spacer-punkty');
  var plan = document.getElementById('spacer-plan'), stozek = document.getElementById('spacer-stozek');
  var bezRuchu = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function rozmiar() {
    var r = cv.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.round(r.width * d), h = Math.round(r.height * d);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); }
    return r;
  }
  function rysuj() {
    if (!gotowe) return;
    var r = rozmiar(), asp = r.width / r.height, tg = Math.tan(fov / 2);
    gl.uniform1f(U.yaw, yaw); gl.uniform1f(U.pitch, pitch); gl.uniform1f(U.tg, tg); gl.uniform1f(U.asp, asp);
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
  function ustawPunkt(n) {
    var p = S.punkty[n]; akt = n;
    yaw = (p.start || 0) * RAD; pitch = 0; fov = 78 * RAD; vy = vp = 0;
    znaczniki.innerHTML = '';
    S.punkty.forEach(function (q, k) {
      if (k === n || (p.do && p.do.indexOf(k) < 0)) return;
      var d = kierunek(p, q.x, q.y, 55);
      var b = document.createElement('button'); b.type = 'button'; b.className = 'spacer__przejscie'; b.textContent = q.nazwa;
      b.dataset.yaw = d[0]; b.dataset.pitch = Math.max(d[1], -0.5);
      b.addEventListener('click', function () { pokaz(k); });
      znaczniki.appendChild(b);
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
  }
  function pokaz(n) {
    if (n === akt) return;
    var p = S.punkty[n]; pole.classList.add('spacer--laduje');
    var im = new Image();
    im.onload = function () {
      setTimeout(function () {
        gl.bindTexture(gl.TEXTURE_2D, tex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, im);
        gotowe = true; ustawPunkt(n); rysuj(); pole.classList.remove('spacer--laduje');
      }, akt < 0 || bezRuchu ? 0 : 260);
    };
    im.src = maly ? p.maly : p.obraz;
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

  // ruch: przeciąganie z wybiegiem, powolny obrót do pierwszego dotknięcia, kółko i przyciski przybliżają
  function ogranicz() { pitch = Math.max(-1.25, Math.min(1.25, pitch)); fov = Math.max(40 * RAD, Math.min(95 * RAD, fov)); }
  function dotkniete() { if (!ruszone) { ruszone = true; pole.classList.add('spacer--ruszony'); } }
  function tyka(t) {
    var dt = Math.min(50, t - ost || 16); ost = t;
    if (!ciagnie && gotowe) {
      if (!ruszone && !bezRuchu) { yaw += 0.00006 * dt; rysuj(); }
      else if (Math.abs(vy) > 0.00002 || Math.abs(vp) > 0.00002) { yaw += vy * dt; pitch += vp * dt; vy *= 0.93; vp *= 0.93; ogranicz(); rysuj(); }
    }
    klatka = requestAnimationFrame(tyka);
  }
  var px = 0, py = 0, pt = 0;
  cv.addEventListener('pointerdown', function (e) { ciagnie = true; px = e.clientX; py = e.clientY; pt = e.timeStamp; vy = vp = 0; cv.setPointerCapture(e.pointerId); dotkniete(); });
  cv.addEventListener('pointermove', function (e) {
    if (!ciagnie) return;
    var r = cv.getBoundingClientRect(), k = fov / r.height, dt = Math.max(1, e.timeStamp - pt);
    var dy = -(e.clientX - px) * k, dp = (e.pointerType === 'mouse' || pole.classList.contains('spacer--pelny')) ? (e.clientY - py) * k : 0;
    yaw += dy; pitch += dp; vy = dy / dt; vp = dp / dt; px = e.clientX; py = e.clientY; pt = e.timeStamp; ogranicz(); rysuj();
  });
  ['pointerup', 'pointercancel'].forEach(function (n) { cv.addEventListener(n, function () { ciagnie = false; }); });
  cv.addEventListener('wheel', function (e) { if (!e.ctrlKey && !pole.classList.contains('spacer--pelny')) return; e.preventDefault(); fov += e.deltaY * 0.0012; ogranicz(); rysuj(); dotkniete(); }, { passive: false });
  cv.addEventListener('keydown', function (e) {
    var d = { ArrowLeft: [-0.12, 0, 0], ArrowRight: [0.12, 0, 0], ArrowUp: [0, 0.08, 0], ArrowDown: [0, -0.08, 0], '+': [0, 0, -0.1], '=': [0, 0, -0.1], '-': [0, 0, 0.1] }[e.key];
    if (!d) return; e.preventDefault(); yaw += d[0]; pitch += d[1]; fov += d[2]; ogranicz(); rysuj(); dotkniete();
  });
  Array.prototype.forEach.call(pole.querySelectorAll('[data-zoom]'), function (b) {
    b.addEventListener('click', function () { fov += +b.dataset.zoom * RAD; ogranicz(); rysuj(); dotkniete(); });
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
  klatka = requestAnimationFrame(tyka);
  setTimeout(function () { pole.classList.add('spacer--ruszony'); }, 7000);   // podpowiedź znika sama, obrót trwa do pierwszego dotknięcia
  pokaz(0);
})();
