/*
 * Acceso a NASA POWER (API mensual) y armado de la serie anual.
 *
 * Formato verificado el 14 nov 2026 (API v2.10.0, Hermosillo):
 *   properties.parameter[VAR]["AAAAMM"], con MM = 01..12 y 13 = valor anual
 *   header.fill_value = -999
 *   T2M_MIN y T2M_MAX: extremo del mes (13: extremo del año)
 *   T2M, TS, PRECTOTCORR: promedio del mes (13: promedio del año)
 *   PRECTOTCORR en mm/day; temperaturas en C
 */
(function (raiz) {
  "use strict";

  var BASE = "https://power.larc.nasa.gov/api/temporal/monthly/point";
  var INICIO = 1981, FIN = 2025;

  var VARIABLES = {
    T2M_MIN: {
      nombre: "Temperatura mínima del aire",
      corta: "la temperatura mínima",
      definicion: "La temperatura más baja del aire a 2 m: qué tan fresca llega a estar la noche. Es el valor extremo del mes o del año, no un promedio.",
      unidad: "°C"
    },
    T2M_MAX: {
      nombre: "Temperatura máxima del aire",
      corta: "la temperatura máxima",
      definicion: "La temperatura más alta del aire a 2 m. Es el valor extremo del mes o del año, no un promedio.",
      unidad: "°C"
    },
    T2M: {
      nombre: "Temperatura media del aire",
      corta: "la temperatura media",
      definicion: "El promedio de la temperatura del aire a 2 m sobre el suelo.",
      unidad: "°C"
    },
    TS: {
      nombre: "Temperatura de la superficie",
      corta: "la temperatura de la superficie",
      definicion: "El promedio de la temperatura del suelo mismo, la piel de la Tierra, no del aire.",
      unidad: "°C"
    },
    PRECTOTCORR: {
      nombre: "Precipitación",
      corta: "la precipitación",
      definicion: "La lluvia promedio por día, corregida con observaciones. Se mide en milímetros por día.",
      unidad: "mm/día"
    }
  };

  var MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
    "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

  function url(lat, lon) {
    return BASE + "?parameters=" + Object.keys(VARIABLES).join(",") +
      "&community=AG&longitude=" + lon.toFixed(2) + "&latitude=" + lat.toFixed(2) +
      "&format=JSON&start=" + INICIO + "&end=" + FIN;
  }

  function validar(json) {
    if (!json || !json.properties || !json.properties.parameter) {
      var msg = json && json.messages && json.messages.length ? json.messages.join(" ") : "respuesta sin datos";
      throw new Error("POWER: " + msg);
    }
    return json;
  }

  /* Descarga en vivo; si falla y hay archivo guardado, usa el archivo. */
  function cargar(lat, lon, respaldo) {
    return fetch(url(lat, lon))
      .then(function (r) {
        if (!r.ok) throw new Error("POWER respondió " + r.status);
        return r.json();
      })
      .then(function (j) { return { json: validar(j), origen: "en vivo" }; })
      .catch(function (err) {
        if (!respaldo) throw err;
        return fetch(respaldo)
          .then(function (r) { if (!r.ok) throw err; return r.json(); })
          .then(function (j) { return { json: validar(j), origen: "guardado" }; })
          .catch(function () { throw err; });
      });
  }

  /*
   * Serie anual de una variable.
   * mes = 0 → año completo (llave 13 que publica POWER); 1..12 → ese mes cada año.
   * Los valores de relleno se vuelven null.
   */
  function serie(json, variable, mes) {
    var datos = json.properties.parameter[variable];
    if (!datos) throw new Error("POWER no trajo " + variable);
    var relleno = json.header && json.header.fill_value !== undefined ? json.header.fill_value : -999;
    var sufijo = mes ? (mes < 10 ? "0" + mes : String(mes)) : "13";
    var anios = [], valores = [];
    for (var a = INICIO; a <= FIN; a++) {
      var v = datos[a + sufijo];
      anios.push(a);
      valores.push(v === undefined || v === null || v === relleno ? null : v);
    }
    return { anios: anios, valores: valores };
  }

  function elevacion(json) {
    var c = json.geometry && json.geometry.coordinates;
    return c && c.length > 2 ? c[2] : null;
  }

  var api = { url: url, cargar: cargar, serie: serie, elevacion: elevacion,
    VARIABLES: VARIABLES, MESES: MESES, INICIO: INICIO, FIN: FIN };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else raiz.Power = api;
})(typeof window !== "undefined" ? window : this);
