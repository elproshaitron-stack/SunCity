/*
 * Tendencia: Theil-Sen + Mann-Kendall en JavaScript.
 *
 * Réplica de compartido/tendencia.py para la Vía A:
 *   - Theil-Sen e intervalo del 95 %: scipy.stats.theilslopes(y, x, alpha=0.95), scipy 1.18
 *   - Mann-Kendall original: pymannkendall.original_test
 * En la Vía A el valor p es el de Mann-Kendall sin ajuste ("exploratorio").
 *
 * Devuelve el objeto de resultado compartido:
 *   { n_anios, pendiente_c_decada, ic95_inf, ic95_sup, p }
 * más campos de apoyo: p_mk, s, var_s, z, intercepto (por año).
 *
 * Funciona en el navegador (window.Tendencia) y en Node (require).
 */
(function (raiz) {
  "use strict";

  // norm.ppf(0.025) de scipy, para el intervalo del 95 %
  var Z_975 = 1.959963984540054;

  function mediana(ordenado) {
    var n = ordenado.length;
    if (n === 0) return NaN;
    var m = Math.floor(n / 2);
    return n % 2 ? ordenado[m] : (ordenado[m - 1] + ordenado[m]) / 2;
  }

  function ordenar(a) {
    return a.slice().sort(function (p, q) { return p - q; });
  }

  // np.round: redondeo a la mitad hacia el par
  function redondearPar(v) {
    var f = Math.floor(v), d = v - f;
    if (d > 0.5) return f + 1;
    if (d < 0.5) return f;
    return f % 2 === 0 ? f : f + 1;
  }

  // Tamaños de los grupos de empates (los grupos de 1 aportan 0 a las fórmulas)
  function gruposEmpate(v) {
    var c = {}, out = [];
    for (var i = 0; i < v.length; i++) c[v[i]] = (c[v[i]] || 0) + 1;
    for (var k in c) if (c[k] > 1) out.push(c[k]);
    return out;
  }

  function sumaEmpates(grupos) {
    var s = 0;
    for (var i = 0; i < grupos.length; i++) {
      var t = grupos[i];
      s += t * (t - 1) * (2 * t + 5);
    }
    return s;
  }

  // erfc con error relativo < 1.2e-7 (Chebyshev, Numerical Recipes 6.2)
  function erfc(x) {
    var z = Math.abs(x), t = 1 / (1 + 0.5 * z);
    var r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 +
      t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 +
      t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? r : 2 - r;
  }

  // P bilateral: 2 * (1 - Φ(|z|)) = erfc(|z| / √2)
  function pBilateral(z) {
    return erfc(Math.abs(z) / Math.SQRT2);
  }

  /* Theil-Sen, igual que scipy.stats.theilslopes(y, x, alpha=0.95) */
  function theilSen(x, y) {
    var n = y.length, pend = [];
    for (var i = 0; i < n - 1; i++) {
      for (var j = i + 1; j < n; j++) {
        var dx = x[j] - x[i];
        if (dx !== 0) pend.push((y[j] - y[i]) / dx);
      }
    }
    pend = ordenar(pend);
    var b = mediana(pend);
    var a = mediana(ordenar(y)) - b * mediana(ordenar(x));

    // Intervalo: ecuación 2.6 de Sen (1968), como scipy
    var nt = pend.length;
    var sigsq = (n * (n - 1) * (2 * n + 5) - sumaEmpates(gruposEmpate(x)) -
      sumaEmpates(gruposEmpate(y))) / 18;
    var lo = NaN, hi = NaN;
    if (nt > 0 && sigsq >= 0) {
      var sigma = Math.sqrt(sigsq);
      var ru = Math.min(redondearPar((nt + Z_975 * sigma) / 2), nt - 1);
      var rl = Math.max(redondearPar((nt - Z_975 * sigma) / 2) - 1, 0);
      lo = pend[rl];
      hi = pend[ru];
    }
    return { pendiente: b, intercepto: a, inf: lo, sup: hi };
  }

  /* Mann-Kendall original, igual que pymannkendall.original_test */
  function mannKendall(y) {
    var n = y.length, s = 0;
    for (var k = 0; k < n - 1; k++) {
      for (var j = k + 1; j < n; j++) {
        if (y[j] > y[k]) s++;
        else if (y[j] < y[k]) s--;
      }
    }
    var varS = (n * (n - 1) * (2 * n + 5) - sumaEmpates(gruposEmpate(y))) / 18;
    var z = s > 0 ? (s - 1) / Math.sqrt(varS) : s < 0 ? (s + 1) / Math.sqrt(varS) : 0;
    return { s: s, var_s: varS, z: z, p: pBilateral(z) };
  }

  /*
   * tendencia(anios, valores, minAnios)
   * Ignora valores nulos o NaN. Si quedan menos de minAnios, devuelve NaN.
   * minAnios = 15 es un marcador: el mínimo real se fija en docs/DECISIONES.md (D08).
   */
  function tendencia(anios, valores, minAnios) {
    if (minAnios === undefined) minAnios = 15;
    var x = [], y = [];
    for (var i = 0; i < valores.length; i++) {
      var v = valores[i];
      if (v !== null && v !== undefined && !isNaN(v)) { x.push(+anios[i]); y.push(+v); }
    }
    var n = y.length;
    var vacio = { n_anios: n, pendiente_c_decada: NaN, ic95_inf: NaN, ic95_sup: NaN,
      p: NaN, p_mk: NaN, s: NaN, var_s: NaN, z: NaN, intercepto: NaN, pendiente_anual: NaN };
    if (n < minAnios || n < 3) return vacio;

    var ts = theilSen(x, y);
    var mk = mannKendall(y);
    return {
      n_anios: n,
      pendiente_c_decada: ts.pendiente * 10,
      ic95_inf: ts.inf * 10,
      ic95_sup: ts.sup * 10,
      p: mk.p,
      p_mk: mk.p,
      s: mk.s,
      var_s: mk.var_s,
      z: mk.z,
      intercepto: ts.intercepto,
      pendiente_anual: ts.pendiente
    };
  }

  var api = { tendencia: tendencia, theilSen: theilSen, mannKendall: mannKendall,
    _redondearPar: redondearPar, _erfc: erfc };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else raiz.Tendencia = api;
})(typeof window !== "undefined" ? window : this);
