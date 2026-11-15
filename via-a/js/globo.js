/*
 * Globo 3D para elegir un punto (MapLibre GL JS, proyección de globo).
 * Mosaicos vectoriales de OpenFreeMap (esquema OpenMapTiles), sin clave.
 * El estilo vive en compartido/mapa-estilo.js: continentes de arena sobre océano de noche.
 *
 *   var g = Globo.crear("mapa", { alElegir: function (lat, lon) {} });
 *   g.mover(lat, lon, centrar)   mueve el marcador y la celda; centrar = volar hasta ahí
 *   Globo.celda(lat, lon)        celda aproximada de MERRA-2 que contiene el punto
 *
 * Si MapLibre o WebGL no están disponibles, crear() devuelve null y deja un aviso
 * en el contenedor: las casillas de latitud y longitud siguen funcionando.
 */
(function (raiz) {
  "use strict";

  // Rejilla nativa de MERRA-2: 0.5° de latitud por 0.625° de longitud,
  // con centros de celda en -90 + 0.5·j y -180 + 0.625·i.
  var D_LAT = 0.5, D_LON = 0.625;

  function celda(lat, lon) {
    var cLat = Math.round((lat + 90) / D_LAT) * D_LAT - 90;
    var cLon = Math.round((lon + 180) / D_LON) * D_LON - 180;
    var s = Math.max(-90, cLat - D_LAT / 2), n = Math.min(90, cLat + D_LAT / 2);
    var o = cLon - D_LON / 2, e = cLon + D_LON / 2;
    return {
      sur: s, norte: n, oeste: o, este: e,
      altoKm: (n - s) * 111.2,
      anchoKm: D_LON * 111.2 * Math.cos(lat * Math.PI / 180)
    };
  }

  function geoCelda(c) {
    return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[
      [c.oeste, c.sur], [c.este, c.sur], [c.este, c.norte], [c.oeste, c.norte], [c.oeste, c.sur]
    ]] } };
  }

  // El estilo base es común a las dos vías (compartido/mapa-estilo.js); aquí solo se suma la celda.
  function estilo() {
    var e = MapaEstilo.base({ proyeccion: "globe" });
    e.sources.celda = { type: "geojson", data: { type: "FeatureCollection", features: [] } };
    return MapaEstilo.insertarAntes(e, MapaEstilo.PRIMER_NOMBRE, [
      { id: "celda-relleno", type: "fill", source: "celda",
        paint: { "fill-color": "#ff5a1f", "fill-opacity": 0.16 } },
      { id: "celda-borde", type: "line", source: "celda",
        paint: { "line-color": "#d63f0c", "line-width": 2, "line-dasharray": [2, 1.5] } }
    ]);
  }

  function crear(idContenedor, opciones) {
    var cont = document.getElementById(idContenedor);
    var aviso = function () {
      cont.classList.add("mapa--sin");
      cont.innerHTML = '<p class="sin-mapa">El globo no cargó. Escribe la latitud y la longitud o elige una ciudad de ejemplo.</p>';
      return null;
    };
    if (typeof maplibregl === "undefined" || typeof MapaEstilo === "undefined") return aviso();

    var quieto = raiz.matchMedia && raiz.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var angosto = raiz.matchMedia && raiz.matchMedia("(max-width: 900px)").matches;
    var mapa;
    try {
      mapa = new maplibregl.Map({
        container: cont, style: estilo(),
        center: [-104, 18], zoom: angosto ? 0.9 : 1.5, maxZoom: 11, minZoom: 0.6,
        attributionControl: false,
        // En el celular el globo vive dentro de la página: un dedo desplaza, dos mueven el globo
        cooperativeGestures: angosto,
        locale: {
          "Map.Title": "Globo para elegir un punto. Con el foco aquí, las flechas lo mueven y + y − lo acercan",
          "NavigationControl.ZoomIn": "Acercar", "NavigationControl.ZoomOut": "Alejar",
          "NavigationControl.ResetBearing": "Orientar al norte",
          "AttributionControl.ToggleAttribution": "Créditos del mapa",
          "CooperativeGesturesHandler.WindowsHelpText": "Usa Ctrl + rueda para acercar el globo",
          "CooperativeGesturesHandler.MacHelpText": "Usa ⌘ + rueda para acercar el globo",
          "CooperativeGesturesHandler.MobileHelpText": "Usa dos dedos para mover el globo"
        }
      });
    } catch (e) { return aviso(); }

    mapa.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapa.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    mapa.dragRotate.disable();
    mapa.touchZoomRotate.disableRotation();

    var punto = document.createElement("div");
    punto.className = "punto";
    punto.innerHTML = '<span class="punto-onda"></span><span class="punto-centro"></span>';
    var marcador = null, pendiente = null, listo = false;

    function pintarCelda(lat, lon) {
      var f = mapa.getSource("celda");
      if (f) f.setData(geoCelda(celda(lat, lon)));
    }

    function mover(lat, lon, centrar) {
      if (!listo) { pendiente = [lat, lon, centrar]; return; }
      if (!marcador) marcador = new maplibregl.Marker({ element: punto }).setLngLat([lon, lat]).addTo(mapa);
      else marcador.setLngLat([lon, lat]);
      pintarCelda(lat, lon);
      if (!centrar) return;
      var destino = { center: [lon, lat], zoom: Math.max(mapa.getZoom(), 5.8) };
      if (quieto) mapa.jumpTo(destino);
      else mapa.flyTo(Object.assign({ duration: 3600, essential: true }, destino));
    }

    mapa.on("load", function () {
      listo = true;
      if (pendiente) { mover.apply(null, pendiente); pendiente = null; }
    });

    mapa.on("click", function (e) {
      var ll = e.lngLat.wrap();
      if (opciones && opciones.alElegir) opciones.alElegir(ll.lat, ll.lng);
    });
    mapa.getCanvas().style.cursor = "crosshair";
    // Sin mapa base (sin red o OpenFreeMap caído): el globo queda de un color y se dice qué hacer
    var avisado = false;
    mapa.on("error", function (e) {
      console.warn("Globo:", e && e.error ? e.error.message : e);
      if (avisado || !e || !(e.sourceId === "omt" || /openfreemap/.test(String(e.error && (e.error.url || e.error.message))))) return;
      avisado = true;
      var aviso = document.createElement("p");
      aviso.className = "aviso-mapa";
      aviso.setAttribute("role", "status");
      aviso.textContent = "El mapa base no cargó. Elige una ciudad o escribe la latitud y la longitud.";
      cont.appendChild(aviso);
    });
    raiz.Globo.mapa = mapa; // para depurar desde la consola

    return { mover: mover, mapa: mapa };
  }

  raiz.Globo = { crear: crear, celda: celda };
})(window);
