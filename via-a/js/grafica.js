/*
 * Gráfica de serie anual con línea de pendiente e intervalo (SVG, sin dependencias).
 *
 * PROVISIONAL: el componente compartido lo hace Mario (docs/03-ARQUITECTURA.md, 3.6).
 * Cuando exista en compartido/, se reemplaza esta llamada por la suya con los mismos datos:
 *   SerieAnual.dibujar(contenedor, { anios, valores, resultado, unidad, titulo })
 * resultado = objeto de tendencia.js (usa pendiente_anual, intercepto, ic95_inf, ic95_sup).
 */
(function (raiz) {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";

  function el(tag, attrs, padre) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (padre) padre.appendChild(e);
    return e;
  }

  function pasoBonito(rango, objetivo) {
    var crudo = rango / objetivo, mag = Math.pow(10, Math.floor(Math.log10(crudo)));
    var r = crudo / mag;
    return (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * mag;
  }

  function fmt(v, dec) { return v.toFixed(dec).replace("-", "−"); }

  function mediana(a) {
    var s = a.slice().sort(function (p, q) { return p - q; }), m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  function dibujar(contenedor, d) {
    contenedor.innerHTML = "";
    // El ancho del dibujo sigue al del contenedor para que el texto no se encoja en el celular
    var W = Math.max(320, Math.min(760, contenedor.clientWidth || 720));
    var H = Math.round(W < 520 ? W * 0.72 : W * 0.47), M = { t: 18, r: 14, b: 38, l: W < 520 ? 44 : 56 };
    var pares = [];
    for (var i = 0; i < d.anios.length; i++) if (d.valores[i] !== null) pares.push([d.anios[i], d.valores[i]]);
    if (!pares.length) return;
    var xs = pares.map(function (p) { return p[0]; }), ys = pares.map(function (p) { return p[1]; });
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
    var r = d.resultado, b = r.pendiente_anual, a = r.intercepto;
    var bLo = r.ic95_inf / 10, bHi = r.ic95_sup / 10;
    var conLinea = isFinite(b) && isFinite(a);
    var conBanda = conLinea && isFinite(bLo) && isFinite(bHi);
    // Abanico del intervalo: pendientes extremas que pasan por el centro de la nube
    var cx = mediana(xs), cy = mediana(ys);
    var extra = [];
    if (conLinea) extra.push(a + b * x0, a + b * x1);
    if (conBanda) extra.push(cy + bLo * (x0 - cx), cy + bLo * (x1 - cx), cy + bHi * (x0 - cx), cy + bHi * (x1 - cx));
    var todos = ys.concat(extra);
    var yMin = Math.min.apply(null, todos), yMax = Math.max.apply(null, todos);
    var pad = (yMax - yMin) * 0.08 || 1;
    yMin -= pad; yMax += pad;
    var paso = pasoBonito(yMax - yMin, 5);
    yMin = Math.floor(yMin / paso) * paso; yMax = Math.ceil(yMax / paso) * paso;
    var dec = paso < 1 ? (paso < 0.1 ? 2 : 1) : 0;

    function X(v) { return M.l + (v - x0) / (x1 - x0) * (W - M.l - M.r); }
    function Y(v) { return H - M.b - (v - yMin) / (yMax - yMin) * (H - M.t - M.b); }

    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "class": "grafica-svg",
      "aria-label": d.titulo || "Serie anual" }, contenedor);
    el("title", {}, svg).textContent = d.titulo || "Serie anual";

    // Rejilla y ejes
    var g = el("g", { "class": "ejes" }, svg);
    for (var t = yMin; t <= yMax + paso / 2; t += paso) {
      el("line", { x1: M.l, x2: W - M.r, y1: Y(t), y2: Y(t), "class": "rejilla" }, g);
      var tx = el("text", { x: M.l - 8, y: Y(t) + 4, "text-anchor": "end" }, g);
      tx.textContent = fmt(t, dec);
    }
    var cada = W < 520 ? 10 : 5;
    for (var an = Math.ceil(x0 / cada) * cada; an <= x1; an += cada) {
      var lx = el("text", { x: X(an), y: H - M.b + 20, "text-anchor": "middle" }, g);
      lx.textContent = an;
    }
    var u = el("text", { x: 14, y: M.t + (H - M.t - M.b) / 2, "text-anchor": "middle",
      transform: "rotate(-90 14 " + (M.t + (H - M.t - M.b) / 2) + ")", "class": "unidad" }, g);
    u.textContent = d.unidad;

    // Banda del intervalo del 95 %
    if (conBanda) {
      var pts = [[x0, cy + bLo * (x0 - cx)], [x1, cy + bLo * (x1 - cx)],
        [x1, cy + bHi * (x1 - cx)], [x0, cy + bHi * (x0 - cx)]];
      el("polygon", { points: pts.map(function (p) { return X(p[0]) + "," + Y(p[1]); }).join(" "),
        "class": "banda" }, svg);
    }

    // Serie
    el("polyline", { points: pares.map(function (p) { return X(p[0]) + "," + Y(p[1]); }).join(" "),
      "class": "serie" }, svg);

    // Pendiente Theil-Sen
    if (conLinea) el("line", { x1: X(x0), y1: Y(a + b * x0), x2: X(x1), y2: Y(a + b * x1), "class": "pendiente" }, svg);

    // Puntos con valor al pasar el cursor
    var gp = el("g", { "class": "puntos" }, svg);
    pares.forEach(function (p) {
      var c = el("circle", { cx: X(p[0]), cy: Y(p[1]), r: 3.6 }, gp);
      el("title", {}, c).textContent = p[0] + ": " + fmt(p[1], 2) + " " + d.unidad;
    });
  }

  var api = { dibujar: dibujar };
  raiz.SerieAnual = api;
})(window);
