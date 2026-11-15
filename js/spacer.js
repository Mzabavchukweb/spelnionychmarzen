// Wirtualny spacer: przeglądarka panoram 360° (WebGL, bez bibliotek). Punkty i przejścia w window.SPACER.
(function () {
  var S = window.SPACER, pole = document.getElementById('spacer'), cv = document.getElementById('spacer-plotno');
  if (!S || !pole || !cv) return;
  var gl = cv.getContext('webgl', { antialias: false, preserveDrawingBuffer: false });
  var info = document.getElementById('spacer-info');
  if (!gl) { info.textContent = 'Ta przeglądarka nie obsługuje podglądu 360°. Poniżej zwykłe obrazy z każdego punktu.'; pole.classList.add('spacer--bez'); return; }

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
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  var yaw = 0, pitch = 0, akt = 0, FOV = 75 * Math.PI / 180, gotowe = false;
  var maly = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE), 4096) < 4096;
  var znaczniki = document.getElementById('spacer-znaczniki'), lista = document.getElementById('spacer-punkty');

  function rozmiar() {
    var r = cv.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.round(r.width * d), h = Math.round(r.height * d);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); }
    return r;
  }
  function rysuj() {
    if (!gotowe) return;
    var r = rozmiar(), asp = r.width / r.height, tg = Math.tan(FOV / 2);
    gl.uniform1f(U.yaw, yaw); gl.uniform1f(U.pitch, pitch); gl.uniform1f(U.tg, tg); gl.uniform1f(U.asp, asp);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    // przejścia: pigułki z nazwą punktu, ustawione w kierunku, w którym ten punkt leży na rzucie
    Array.prototype.forEach.call(znaczniki.children, function (z) {
      var k = +z.dataset.yaw, p = +z.dataset.pitch;
      var x = Math.sin(k) * Math.cos(p), y = Math.sin(p), zz = Math.cos(k) * Math.cos(p);
      var cy = Math.cos(-yaw), sy = Math.sin(-yaw), x1 = x * cy + zz * sy, z1 = zz * cy - x * sy;
      var cp = Math.cos(-pitch), sp = Math.sin(-pitch), y2 = y * cp + z1 * sp, z2 = z1 * cp - y * sp;
      if (z2 <= 0.05) { z.hidden = true; return; }
      var sx = x1 / z2 / (tg * asp), syy = y2 / z2 / tg;
      z.hidden = Math.abs(sx) > 1.05 || Math.abs(syy) > 1.05;
      z.style.left = ((sx + 1) / 2 * 100) + '%'; z.style.top = ((1 - syy) / 2 * 100) + '%';
    });
  }
  function pokaz(n) {
    akt = n; var p = S.punkty[n]; gotowe = false; pole.classList.add('spacer--laduje');
    var im = new Image();
    im.onload = function () {
      gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, im);
      gotowe = true; pole.classList.remove('spacer--laduje'); yaw = (p.start || 0) * Math.PI / 180; pitch = 0;
      znaczniki.innerHTML = '';
      S.punkty.forEach(function (q, k) {
        if (k === n) return;
        var dx = q.x - p.x, dw = -(q.y - p.y), odl = Math.sqrt(dx * dx + dw * dw);
        var b = document.createElement('button'); b.type = 'button'; b.className = 'spacer__przejscie'; b.textContent = q.nazwa;
        b.dataset.yaw = Math.atan2(dx, dw); b.dataset.pitch = -Math.atan(95 / odl);
        b.addEventListener('click', function () { pokaz(k); });
        znaczniki.appendChild(b);
      });
      Array.prototype.forEach.call(lista.children, function (b, k) { b.setAttribute('aria-pressed', k === n); });
      info.textContent = p.opis; rysuj();
    };
    im.src = maly ? p.maly : p.obraz;
  }
  S.punkty.forEach(function (p, k) {
    var b = document.createElement('button'); b.type = 'button'; b.textContent = p.nazwa; b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', function () { pokaz(k); }); lista.appendChild(b);
  });

  // obracanie: przeciąganie w poziomie i w pionie (na telefonie pionowy ruch przewija stronę), strzałki na klawiaturze
  var ciagnie = false, px = 0, py = 0;
  function ogranicz() { pitch = Math.max(-1.2, Math.min(1.2, pitch)); }
  cv.addEventListener('pointerdown', function (e) { ciagnie = true; px = e.clientX; py = e.clientY; cv.setPointerCapture(e.pointerId); pole.classList.add('spacer--ruszony'); });
  cv.addEventListener('pointermove', function (e) {
    if (!ciagnie) return;
    var r = cv.getBoundingClientRect(), k = FOV / r.height;
    yaw -= (e.clientX - px) * k; if (e.pointerType === 'mouse') pitch += (e.clientY - py) * k;
    px = e.clientX; py = e.clientY; ogranicz(); rysuj();
  });
  ['pointerup', 'pointercancel'].forEach(function (n) { cv.addEventListener(n, function () { ciagnie = false; }); });
  cv.addEventListener('keydown', function (e) {
    var d = { ArrowLeft: [-0.12, 0], ArrowRight: [0.12, 0], ArrowUp: [0, 0.08], ArrowDown: [0, -0.08] }[e.key];
    if (!d) return; e.preventDefault(); yaw += d[0]; pitch += d[1]; ogranicz(); rysuj(); pole.classList.add('spacer--ruszony');
  });
  window.addEventListener('resize', rysuj);
  pokaz(0);
})();
