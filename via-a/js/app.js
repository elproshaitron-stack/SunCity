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
      var malLat = isNaN(lat) || Math.abs(lat) > 90, malLon = isNaN(lon) || Math.abs(lon) > 180;
      // El error va junto al campo que lo tiene (componentes.js); sin él, en la línea de estado
      if (window.SC) {
        SC.errorCampo("lat", malLat ? "Escribe una latitud entre −90 y 90." : null);
        SC.errorCampo("lon", malLon ? "Escribe una longitud entre −180 y 180." : null);
        if (malLat || malLon) { $(malLat ? "lat" : "lon").focus(); return; }
      } else if (malLat || malLon) {
        mostrarEstado("Escribe una latitud entre −90 y 90 y una longitud entre −180 y 180.", "error");
        return;
      }
      fijarLugar({ lat: lat, lon: lon }, true);
    });

    $("ubicar").addEventListener("click", usarUbicacion);
    $("csv").addEventListener("click", descargarCSV);
    $("imprimir").addEventListener("click", function () { window.print(); });
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

  /* ---------- Mi ubicación ----------
     El navegador pide permiso. La posición se redondea a una décima de grado (unos 10 km) antes
     de usarla: es lo único que viaja, como coordenadas de la consulta a NASA POWER, y no se guarda. */
  var NOTA_UBICACION = "Se redondea a unos 10 km y solo se usa para pedir la serie a NASA POWER. SunCity no la guarda.";
  function usarUbicacion() {
    var b = $("ubicar"), nota = $("ubicar-nota");
    var ocupado = function (si) { if (window.SC) SC.cargando(b, si); else b.disabled = si; };
    var decir = function (texto, error) { nota.textContent = texto; nota.classList.toggle("ubicar-nota--error", !!error); };
    if (!navigator.geolocation) {
      decir("Este navegador no puede dar tu ubicación. Elige un punto en el globo o escribe la latitud y la longitud.", true);
      return;
    }
    ocupado(true);
    decir("Esperando tu permiso y la posición…");
    navigator.geolocation.getCurrentPosition(function (p) {
      ocupado(false);
      var lat = Math.round(p.coords.latitude * 10) / 10, lon = Math.round(p.coords.longitude * 10) / 10;
      decir("Usando tu zona: " + num(lat, 1) + ", " + num(lon, 1) + ". " + NOTA_UBICACION);
      fijarLugar({ lat: lat, lon: lon, nombre: "tu zona" }, true);
    }, function (err) {
      ocupado(false);
      decir(err && err.code === 1
        ? "No diste permiso para usar tu ubicación. Puedes elegir un punto en el globo, una ciudad o escribir las coordenadas."
        : err && err.code === 3
          ? "La ubicación tardó demasiado. Inténtalo de nuevo o elige un punto en el globo."
          : "No se pudo determinar tu ubicación. Elige un punto en el globo o escribe las coordenadas.", true);
    }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 });
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
    guardarEnURL();
    mostrarCarga("Descargando 45 años de NASA POWER para " + nombreLugar(lugar) + "…");
    Power.cargar(lugar.lat, lugar.lon, lugar.ciudad && lugar.ciudad.respaldo)
      .then(function (r) {
        cache[clave] = r;
        if (mio !== pedido) return;
        estado.datos = r.json; estado.origen = r.origen;
        calcular();
      })
      .catch(function (err) {
        if (mio !== pedido) return;
        mostrarErrorDescarga(lugar, err);
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
    terminarCarga();
    // Encabezado de la hoja impresa
    $("imp-contexto").textContent = lugarTxt.charAt(0).toUpperCase() + lugarTxt.slice(1) + " (" + num(l.lat, 2) + ", " + num(l.lon, 2) + ") · " +
      v.nombre + " · " + (estado.mes ? Power.MESES[estado.mes - 1] + " de cada año" : "año completo");
    $("imp-origen").textContent = "Consultado el " + new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }) +
      " · " + location.href;
    mostrarEstado("Datos de NASA POWER, " + a0 + "-" + a1 + ' <span class="sc-insignia sc-insignia--exploratorio origen">' +
      (estado.origen === "en vivo" ? "descargados ahora" : "copia guardada") + "</span>", "", true);
    if (estado.origen === "guardado") {
      var version = estado.datos.header && estado.datos.header.api ? " (API " + estado.datos.header.api.version + ")" : "";
      mostrarAviso("advertencia", "Sin respuesta de NASA POWER",
        "Se muestra la copia guardada de " + lugarTxt + version + ", con la misma serie 1981-2025. El cálculo es igual; solo cambia de dónde vienen los datos.",
        { texto: "Intentar en vivo", alHacer: function () { delete cache[claveDe(l)]; fijarLugar(l, false); } });
    }

    // Punto sin ningún dato para esta variable y temporada
    if (r.n_anios === 0) {
      $("tarjeta").hidden = true;
      $("vacio-titulo").textContent = "Sin datos para este punto";
      $("vacio-texto").textContent = "NASA POWER no tiene valores de " + v.nombre.toLowerCase() + textoTemporada(estado.mes) +
        " en " + lugarTxt + ". Prueba otra variable, otra temporada u otro punto.";
      $("vacio").hidden = false;
      anunciar($("vacio-titulo").textContent + ". " + $("vacio-texto").textContent);
      pintarEscala(l);
      return;
    }

    var sello = $("sello"), tarjeta = $("tarjeta");
    tarjeta.hidden = false;

    if (isNaN(r.pendiente_c_decada)) {
      sello.className = "sc-insignia sc-insignia--sin-calculo"; sello.textContent = "Sin cálculo";
      $("titular").textContent = "No hay suficientes años con datos";
      $("frase").textContent = "Solo hay " + r.n_anios + " años válidos para " + sujeto + " en " + lugarTxt + ".";
      ["c-pend", "c-rango", "c-p"].forEach(function (id) { $(id).textContent = "—"; });
      $("c-n").textContent = r.n_anios;
      anunciar("Sin cálculo: solo hay " + r.n_anios + " años válidos.");
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
    anunciar(sello.textContent + ". " + $("titular").textContent + ", " + lugarTxt + ", " + sujeto + ".");
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

  function claveDe(l) { return l.lat.toFixed(2) + "," + l.lon.toFixed(2); }

  function ocultarResultado() {
    $("tarjeta").hidden = true; $("escala").hidden = true; $("vacio").hidden = true; $("aviso").hidden = true;
  }

  // Mientras se descarga: el esqueleto ocupa el lugar del veredicto
  function anunciar(texto) { $("anuncio").textContent = texto; }

  function mostrarCarga(texto) {
    anunciar(texto);
    ocultarResultado();
    $("esqueleto").hidden = false;
    document.querySelector(".resultado").setAttribute("aria-busy", "true");
    mostrarEstado(texto);
  }
  function terminarCarga() {
    $("esqueleto").hidden = true; $("vacio").hidden = true; $("aviso").hidden = true;
    document.querySelector(".resultado").removeAttribute("aria-busy");
  }

  // Aviso junto al resultado: sc-aviso con título, texto y, si hay, una acción
  function mostrarAviso(tipo, titulo, texto, accion) {
    var caja = $("aviso");
    caja.className = "aviso-datos sc-aviso sc-aviso--" + tipo;
    if (tipo === "error") caja.setAttribute("role", "alert"); else caja.removeAttribute("role");
    var partes = [
      Object.assign(document.createElement("p"), { className: "sc-aviso__titulo", textContent: titulo }),
      Object.assign(document.createElement("p"), { className: "sc-aviso__texto", textContent: texto })
    ];
    if (accion) {
      var fila = Object.assign(document.createElement("div"), { className: "sc-aviso__acciones" });
      var b = Object.assign(document.createElement("button"), { type: "button", className: "sc-boton sc-boton--secundario sc-boton--compacto" });
      b.innerHTML = '<svg class="sc-icono sc-icono--chico" aria-hidden="true"><use href="../compartido/iconos.svg#reintentar"/></svg>';
      b.appendChild(document.createTextNode(accion.texto));
      b.addEventListener("click", accion.alHacer);
      fila.appendChild(b); partes.push(fila);
    }
    caja.replaceChildren.apply(caja, partes);
    caja.hidden = false;
  }

  function mostrarErrorDescarga(lugar, err) {
    terminarCarga();
    ocultarResultado();
    anunciar("");
    var sinRed = navigator.onLine === false;
    mostrarEstado("");
    mostrarAviso("error", "No se pudo descargar la serie",
      (sinRed ? "Parece que no hay conexión a internet. " : "NASA POWER no respondió (" + err.message + "). ") +
      "Revisa la conexión y vuelve a intentarlo; el lugar y la variable se conservan.",
      { texto: "Reintentar descarga", alHacer: function () { fijarLugar(lugar, false); } });
    $("aviso").querySelector("button").focus({ preventScroll: true });
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
  // Cada consulta nueva es una entrada del historial: Atrás vuelve a la anterior.
  // La primera reemplaza (abrir la página no debe dejar una entrada vacía detrás).
  var primeraEntrada = true;
  function guardarEnURL() {
    if (!estado.lugar) return;
    var h = "lat=" + estado.lugar.lat.toFixed(2) + "&lon=" + estado.lugar.lon.toFixed(2) +
      "&var=" + estado.variable + "&mes=" + estado.mes;
    if (location.hash === "#" + h) { primeraEntrada = false; return; }
    try { history[primeraEntrada ? "replaceState" : "pushState"](null, "", "#" + h); } catch (e) { /* vista previa sin historial */ }
    primeraEntrada = false;
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
    var avisar = function (texto, tipo) {
      if (window.SC) SC.toast(texto, { tipo: tipo });
      else mostrarEstado(texto);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(location.href).then(
        function () { avisar("Enlace copiado. Quien lo abra verá este mismo lugar, variable y temporada."); },
        function () { avisar("No se pudo copiar. Copia la dirección de la barra del navegador.", "error"); });
    } else avisar("No se pudo copiar. Copia la dirección de la barra del navegador.", "error");
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
