/*
 * Vía A: flujo de tres preguntas (dónde, qué variable, qué temporada).
 * Descarga una vez por lugar las cinco variables de POWER y recalcula al instante.
 */
(function () {
  "use strict";

  // Ciudades de demostración. respaldo: archivo guardado con via-a/datos/descargar.py.
  // Segunda ciudad árida: Mexicali (DECISIONES.md, D12).
  var CIUDADES = [
    { id: "hermosillo", nombre: "Hermosillo, Sonora", lat: 29.07, lon: -110.97,
      respaldo: "datos/hermosillo.json", viaB: true },
    { id: "mexicali", nombre: "Mexicali, Baja California", lat: 32.62, lon: -115.45,
      respaldo: "datos/mexicali.json" }
  ];
  var HERMOSILLO = CIUDADES[0];

  var estado = { lugar: null, variable: "T2M_MIN", mes: 0, datos: null, origen: "", serie: null, res: null };
  var cache = {};
  var pedido = 0;
  var globo = null;

  // Etiquetas cortas de los botones; el nombre completo y la definición van debajo.
  var ETIQUETAS = { T2M_MIN: "Mínima del aire", T2M_MAX: "Máxima del aire", T2M: "Media del aire",
    TS: "Superficie", PRECTOTCORR: "Precipitación" };

  var $ = function (id) { return document.getElementById(id); };

  /* ---------- Formato ---------- */
  function num(v, dec) {
    var s = Math.abs(v).toFixed(dec);
    return (v < 0 && +s !== 0 ? "−" : "") + s;
  }
  function conSigno(v, dec) { return (v > 0 && +v.toFixed(dec) !== 0 ? "+" : "") + num(v, dec); }
  function fmtP(p) { return p < 0.001 ? "< 0.001" : p.toFixed(3); }
  function nombreLugar(l) { return l.nombre || ("el punto " + num(l.lat, 2) + ", " + num(l.lon, 2)); }
  function textoTemporada(mes) { return mes ? " de " + Power.MESES[mes - 1] : " del año"; }

  /* ---------- Preguntas ---------- */
  function armarControles() {
    var ciu = $("ciudades");
    ciu.innerHTML = CIUDADES.map(function (c) {
      return '<button type="button" class="sc-chip" data-ciudad="' + c.id + '" aria-pressed="false">' + c.nombre + "</button>";
    }).join("");
    ciu.addEventListener("click", function (e) {
      var b = e.target.closest("[data-ciudad]");
      if (!b) return;
      var c = CIUDADES.filter(function (x) { return x.id === b.getAttribute("data-ciudad"); })[0];
      if (c) fijarLugar({ lat: c.lat, lon: c.lon, nombre: c.nombre, ciudad: c }, true);
    });

    var cont = $("variables");
    cont.innerHTML = Object.keys(Power.VARIABLES).map(function (k) {
      return '<label class="sc-chip"><input type="radio" name="variable" value="' + k + '">' +
        "<span>" + ETIQUETAS[k] + "</span></label>";
    }).join("");
    cont.addEventListener("change", function (e) {
      if (e.target.name === "variable") { estado.variable = e.target.value; pintarDefinicion(); calcular(); }
    });

    var tem = $("temporada");
    // Año completo como chip; los doce meses como segmento. Es un solo grupo de radios.
    tem.innerHTML = '<label class="sc-chip"><input type="radio" name="temporada" value="0"><span>Año completo</span></label>' +
      '<div class="sc-segmento sc-segmento--envuelve meses">' +
      Power.MESES.map(function (m, i) {
        return '<label class="sc-segmento__opcion" title="Solo ' + m + ' de cada año"><input type="radio" name="temporada" value="' + (i + 1) +
          '" aria-label="Solo ' + m + ' de cada año"><span aria-hidden="true">' + m.slice(0, 3) + "</span></label>";
      }).join("") + "</div>";
    tem.addEventListener("change", function (e) {
      if (e.target.name === "temporada") { estado.mes = +e.target.value; calcular(); }
    });

    $("ir").addEventListener("click", function () {
      var lat = parseFloat($("lat").value), lon = parseFloat($("lon").value);
      if (isNaN(lat) || isNaN(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
        mostrarEstado("Escribe una latitud entre −90 y 90 y una longitud entre −180 y 180.", "error");
        return;
      }
      fijarLugar({ lat: lat, lon: lon }, true);
    });

    $("csv").addEventListener("click", descargarCSV);
    $("enlace").addEventListener("click", copiarEnlace);
  }

  function sincronizarControles() {
    var r = document.querySelector('input[name="variable"][value="' + estado.variable + '"]');
    if (r) r.checked = true;
    var t = document.querySelector('input[name="temporada"][value="' + estado.mes + '"]');
    if (t) t.checked = true;
    pintarDefinicion();
    if (estado.lugar) {
      $("lat").value = estado.lugar.lat.toFixed(2);
      $("lon").value = estado.lugar.lon.toFixed(2);
      var id = estado.lugar.ciudad ? estado.lugar.ciudad.id : "";
      Array.prototype.forEach.call(document.querySelectorAll("[data-ciudad]"), function (b) {
        b.setAttribute("aria-pressed", String(b.getAttribute("data-ciudad") === id));
      });
    }
  }

  function pintarDefinicion() {
    var v = Power.VARIABLES[estado.variable];
    $("definicion").innerHTML = "<strong>" + v.nombre + "</strong> <code>" + estado.variable + "</code> " + v.definicion;
  }

  /* ---------- Globo ---------- */
  function armarMapa() {
    globo = Globo.crear("mapa", {
      alElegir: function (lat, lon) { fijarLugar({ lat: lat, lon: lon }, false); }
    });
  }

  function moverMarcador(centrar) {
    if (!estado.lugar) return;
    var c = Globo.celda(estado.lugar.lat, estado.lugar.lon);
    $("celda-texto").textContent = "El recuadro marca la celda aproximada de MERRA-2: unos " +
      Math.round(c.anchoKm) + " × " + Math.round(c.altoKm) + " km aquí.";
    if (globo) globo.mover(estado.lugar.lat, estado.lugar.lon, centrar);
  }

  /* ---------- Datos ---------- */
  function fijarLugar(lugar, centrar) {
    lugar.lat = Math.round(lugar.lat * 100) / 100;
    lugar.lon = Math.round(lugar.lon * 100) / 100;
    if (!lugar.ciudad) {
      var c = CIUDADES.filter(function (x) { return x.lat === lugar.lat && x.lon === lugar.lon; })[0];
      if (c) { lugar.ciudad = c; lugar.nombre = c.nombre; }
    }
    estado.lugar = lugar;
    sincronizarControles();
    moverMarcador(centrar);
    var mio = ++pedido;
    var clave = lugar.lat.toFixed(2) + "," + lugar.lon.toFixed(2);
    if (cache[clave]) { estado.datos = cache[clave].json; estado.origen = cache[clave].origen; calcular(); return; }

    estado.datos = null;
    estado.serie = null;
    estado.res = null;
    $("tarjeta").hidden = true;
    $("escala").hidden = true;
    guardarEnURL();
    mostrarEstado("Descargando 45 años de NASA POWER para " + nombreLugar(lugar) + "…", "cargando");
    Power.cargar(lugar.lat, lugar.lon, lugar.ciudad && lugar.ciudad.respaldo)
      .then(function (r) {
        cache[clave] = r;
        if (mio !== pedido) return;
        estado.datos = r.json; estado.origen = r.origen;
        calcular();
      })
      .catch(function (err) {
        if (mio !== pedido) return;
        $("tarjeta").hidden = true;
        mostrarEstado("No se pudieron obtener los datos (" + err.message + "). Revisa la conexión e inténtalo de nuevo.", "error");
      });
  }

  /* ---------- Cálculo y resultado ---------- */
  function calcular() {
    guardarEnURL();
    if (!estado.datos) return;
    var s = Power.serie(estado.datos, estado.variable, estado.mes);
    var r = Tendencia.tendencia(s.anios, s.valores);
    estado.serie = s; estado.res = r;
    pintar(s, r);
  }

  function pintar(s, r) {
    var v = Power.VARIABLES[estado.variable], u = v.unidad, l = estado.lugar;
    var lugarTxt = nombreLugar(l), sujeto = v.corta + textoTemporada(estado.mes);
    var a0 = s.anios[0], a1 = s.anios[s.anios.length - 1];
    mostrarEstado("Datos de NASA POWER, " + a0 + "-" + a1 + ' <span class="sc-insignia sc-insignia--exploratorio origen">' +
      (estado.origen === "en vivo" ? "descargados ahora" : "archivo guardado") + "</span>", "", true);

    var sello = $("sello"), tarjeta = $("tarjeta");
    tarjeta.hidden = false;

    if (isNaN(r.pendiente_c_decada)) {
      sello.className = "sc-insignia sc-insignia--sin-calculo"; sello.textContent = "Sin cálculo";
      $("titular").textContent = "No hay suficientes años con datos";
      $("frase").textContent = "Solo hay " + r.n_anios + " años válidos para " + sujeto + " en " + lugarTxt + ".";
      ["c-pend", "c-rango", "c-p"].forEach(function (id) { $(id).textContent = "—"; });
      $("c-n").textContent = r.n_anios;
      $("grafica").innerHTML = "";
      pintarEscala(l);
      return;
    }

    var sig = r.p < 0.05, b = r.pendiente_c_decada;
    var dir = +b.toFixed(2) === 0 ? "prácticamente no cambia" : b > 0 ? "sube" : "baja";
    var cruzaCero = r.ic95_inf <= 0 && r.ic95_sup >= 0;
    var rangoTxt = conSigno(r.ic95_inf, 2) + " a " + conSigno(r.ic95_sup, 2) + " " + u;

    sello.className = "sc-insignia " + (sig ? "sc-insignia--significativo" : "sc-insignia--neutro");
    sello.textContent = sig ? "Significativo" : "Sin evidencia suficiente todavía";
    $("titular").textContent = dir === "prácticamente no cambia"
      ? "Prácticamente sin cambio"
      : (b > 0 ? "Sube " : "Baja ") + num(Math.abs(b), 2) + " " + u + " por década";

    var frase;
    if (sig) {
      frase = "En " + lugarTxt + ", " + sujeto + " " + dir + " en promedio " + num(Math.abs(b), 2) + " " + u +
        " por década entre " + a0 + " y " + a1 + ". Con 95 % de confianza, el cambio por década está entre " +
        conSigno(r.ic95_inf, 2) + " y " + conSigno(r.ic95_sup, 2) + " " + u + ". Mann-Kendall indica que la tendencia es significativa (p " +
        (r.p < 0.001 ? "< 0.001" : "= " + fmtP(r.p)) + ").";
      if (cruzaCero) frase += " El rango incluye el cero, así que conviene leer el signo con cautela.";
    } else {
      frase = "En " + lugarTxt + ", la pendiente estimada de " + sujeto + " es " + conSigno(b, 2) + " " + u +
        " por década entre " + a0 + " y " + a1 + ", pero los datos no alcanzan para distinguirla de las variaciones normales entre años (p = " +
        fmtP(r.p) + "). Que no sea significativa también es un resultado: todavía no hay evidencia suficiente de cambio.";
    }
    $("frase").textContent = frase;
    $("c-pend").textContent = conSigno(b, 2) + " " + u;
    $("c-rango").textContent = rangoTxt;
    $("c-p").textContent = fmtP(r.p);
    $("c-n").textContent = r.n_anios + " de " + s.anios.length;

    var compartida = typeof window.dibujarSerieCompartida === "function";
    $("leyenda-provisional").hidden = compartida;
    if (compartida) {
      // Componente compartido con la Vía B (compartido/serie-anual.js)
      window.dibujarSerieCompartida($("grafica"), {
        anios: s.anios, valores: s.valores, resultado: r, unidad: u, incluirCero: false
      });
    } else {
      SerieAnual.dibujar($("grafica"), {
        anios: s.anios, valores: s.valores, resultado: r, unidad: u,
        titulo: v.nombre + textoTemporada(estado.mes) + " en " + lugarTxt + ", " + a0 + "-" + a1 +
          ": " + conSigno(b, 2) + " " + u + " por década"
      });
    }
    pintarEscala(l);
  }

  function pintarEscala(l) {
    $("escala").hidden = false;
    var dLat = l.lat - HERMOSILLO.lat, dLon = (l.lon - HERMOSILLO.lon) * Math.cos(l.lat * Math.PI / 180);
    $("puente").hidden = Math.sqrt(dLat * dLat + dLon * dLon) > 0.5; // ~55 km
  }

  function mostrarEstado(texto, clase, html) {
    var e = $("estado");
    if (clase === "error") {
      // Un error es un aviso con forma y texto, no solo color
      e.className = "estado sc-aviso sc-aviso--error";
      e.replaceChildren(Object.assign(document.createElement("p"), { className: "sc-aviso__texto", textContent: texto }));
      return;
    }
    e.className = "estado" + (clase ? " " + clase : "");
    if (html) e.innerHTML = texto; else e.textContent = texto;
  }

  /* ---------- Compartir ---------- */
  function guardarEnURL() {
    if (!estado.lugar) return;
    var h = "lat=" + estado.lugar.lat.toFixed(2) + "&lon=" + estado.lugar.lon.toFixed(2) +
      "&var=" + estado.variable + "&mes=" + estado.mes;
    try { history.replaceState(null, "", "#" + h); } catch (e) { /* vista previa sin historial */ }
  }

  function leerURL() {
    var q = new URLSearchParams(location.hash.slice(1));
    var variable = q.get("var");
    if (Object.prototype.hasOwnProperty.call(Power.VARIABLES, variable)) estado.variable = variable;
    var m = Number(q.get("mes")); if (Number.isInteger(m) && m >= 0 && m <= 12) estado.mes = m;
    var lat = q.get("lat"), lon = q.get("lon");
    if (!lat || !lat.trim() || !lon || !lon.trim()) return null;
    lat = Number(lat); lon = Number(lon);
    return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180
      ? { lat: lat, lon: lon } : null;
  }

  function descargarCSV() {
    if (!estado.serie) return;
    var v = estado.variable, r = estado.res, l = estado.lugar;
    var filas = [
      "# SunCity Via A. Fuente: NASA POWER API mensual (MERRA-2)",
      "# lugar," + nombreLugar(l).replace(/,/g, ""),
      "# latitud," + l.lat.toFixed(2) + ",longitud," + l.lon.toFixed(2),
      "# variable," + v + ",unidad," + Power.VARIABLES[v].unidad,
      "# temporada," + (estado.mes ? Power.MESES[estado.mes - 1] : "anual (llave 13 de POWER)"),
      "# n_anios," + r.n_anios + ",pendiente_por_decada," + r.pendiente_c_decada +
        ",ic95_inf," + r.ic95_inf + ",ic95_sup," + r.ic95_sup + ",p_mann_kendall," + r.p,
      "anio,valor"
    ];
    estado.serie.anios.forEach(function (a, i) {
      var val = estado.serie.valores[i];
      filas.push(a + "," + (val === null ? "" : val));
    });
    var blob = new Blob([filas.join("\n") + "\n"], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "suncity_" + v + "_" + (estado.mes || "anual") + "_" + l.lat.toFixed(2) + "_" + l.lon.toFixed(2) + ".csv";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  function copiarEnlace() {
    var b = $("enlace"), txt = location.href;
    var listo = function () { b.textContent = "Enlace copiado"; setTimeout(function () { b.textContent = "Copiar enlace"; }, 2000); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(listo, function () { b.textContent = "Copia la dirección del navegador"; });
    else b.textContent = "Copia la dirección del navegador";
  }

  /* ---------- Inicio ---------- */
  armarControles();
  armarMapa();
  var desdeURL = leerURL();
  sincronizarControles();
  if (desdeURL) fijarLugar(desdeURL, true);
  else fijarLugar({ lat: HERMOSILLO.lat, lon: HERMOSILLO.lon, nombre: HERMOSILLO.nombre, ciudad: HERMOSILLO }, true);

  // El componente compartido carga como módulo después de este archivo: se vuelve a dibujar
  window.addEventListener("grafica-compartida", function () {
    if (estado.serie) pintar(estado.serie, estado.res);
  });

  var tAncho;
  window.addEventListener("resize", function () {
    clearTimeout(tAncho);
    tAncho = setTimeout(function () { if (estado.serie) pintar(estado.serie, estado.res); }, 150);
  });

  // Un enlace pegado en la misma pestaña cambia solo el #: se vuelve a leer
  window.addEventListener("hashchange", function () {
    var l = leerURL();
    sincronizarControles();
    if (l && (!estado.lugar || l.lat !== estado.lugar.lat || l.lon !== estado.lugar.lon)) fijarLugar(l, true);
    else calcular();
  });
})();
