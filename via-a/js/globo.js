/*
 * Globo 3D para elegir un punto (MapLibre GL JS, proyección de globo).
 * Mosaicos vectoriales de OpenFreeMap (esquema OpenMapTiles), sin clave.
 * El estilo es propio: continentes de arena sobre océano de noche.
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

  var NOMBRE = ["coalesce", ["get", "name:es"], ["get", "name:latin"], ["get", "name"]];

  function estilo() {
    return {
      version: 8,
      projection: { type: "globe" },
      glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
      sources: {
        omt: { type: "vector", url: "https://tiles.openfreemap.org/planet",
          attribution: '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> Datos de <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' },
        celda: { type: "geojson", data: { type: "FeatureCollection", features: [] } }
      },
      sky: {
        "sky-color": "#0a1024",
        "horizon-color": "#f2b27a",
        "fog-color": "#0a1024",
        "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 3, 1, 5, 0]
      },
      light: { anchor: "map", position: [1.5, 90, 80] },
      layers: [
        { id: "tierra", type: "background", paint: { "background-color": "#dcc195" } },
        { id: "vegetacion", type: "fill", source: "omt", "source-layer": "landcover",
          filter: ["in", ["get", "class"], ["literal", ["wood", "grass", "farmland"]]],
          paint: { "fill-color": "#b9ad7c", "fill-opacity": 0.55 } },
        { id: "hielo", type: "fill", source: "omt", "source-layer": "landcover",
          filter: ["==", ["get", "class"], "ice"],
          paint: { "fill-color": "#f4efe4" } },
        { id: "ciudad", type: "fill", source: "omt", "source-layer": "landuse", minzoom: 6,
          filter: ["in", ["get", "class"], ["literal", ["residential", "commercial", "industrial"]]],
          paint: { "fill-color": "#b98f62", "fill-opacity": 0.6 } },
        { id: "agua", type: "fill", source: "omt", "source-layer": "water",
          paint: { "fill-color": "#12224a" } },
        { id: "rios", type: "line", source: "omt", "source-layer": "waterway", minzoom: 6,
          paint: { "line-color": "#12224a", "line-width": 1 } },
        { id: "caminos", type: "line", source: "omt", "source-layer": "transportation", minzoom: 6,
          filter: ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary"]]],
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#8a6b47", "line-opacity": 0.55,
            "line-width": ["interpolate", ["linear"], ["zoom"], 6, 0.6, 11, 2.2] } },
        { id: "estados", type: "line", source: "omt", "source-layer": "boundary", minzoom: 3,
          filter: ["all", ["==", ["get", "admin_level"], 4], ["!=", ["get", "maritime"], 1]],
          paint: { "line-color": "#8a6b47", "line-opacity": 0.6, "line-width": 0.7, "line-dasharray": [3, 2] } },
        { id: "paises", type: "line", source: "omt", "source-layer": "boundary",
          filter: ["all", ["==", ["get", "admin_level"], 2], ["!=", ["get", "maritime"], 1]],
          paint: { "line-color": "#6e5132",
            "line-width": ["interpolate", ["linear"], ["zoom"], 0, 0.5, 6, 1.4] } },
        { id: "celda-relleno", type: "fill", source: "celda",
          paint: { "fill-color": "#ff5a1f", "fill-opacity": 0.16 } },
        { id: "celda-borde", type: "line", source: "celda",
          paint: { "line-color": "#d63f0c", "line-width": 2, "line-dasharray": [2, 1.5] } },
        { id: "nombre-ciudad", type: "symbol", source: "omt", "source-layer": "place", minzoom: 4,
          filter: ["all", ["==", ["get", "class"], "city"],
            ["<=", ["get", "rank"], ["interpolate", ["linear"], ["zoom"], 4, 3, 7, 9, 9, 20]]],
          layout: { "text-field": NOMBRE, "text-font": ["Noto Sans Regular"],
            "text-size": ["interpolate", ["linear"], ["zoom"], 4, 11, 9, 15], "text-max-width": 8 },
          paint: { "text-color": "#3a2a18", "text-halo-color": "rgba(236, 216, 180, .9)", "text-halo-width": 1.4 } },
        { id: "nombre-pais", type: "symbol", source: "omt", "source-layer": "place", maxzoom: 7,
          filter: ["all", ["==", ["get", "class"], "country"],
            ["<=", ["get", "rank"], ["interpolate", ["linear"], ["zoom"], 1, 1, 3, 3, 5, 6]]],
          layout: { "text-field": NOMBRE, "text-font": ["Noto Sans Bold"], "text-transform": "uppercase",
            "text-letter-spacing": 0.12, "text-max-width": 7,
            "text-size": ["interpolate", ["linear"], ["zoom"], 1, 9, 5, 14] },
          paint: { "text-color": "#4a3520", "text-halo-color": "rgba(236, 216, 180, .85)", "text-halo-width": 1.2 } }
      ]
    };
  }

  function crear(idContenedor, opciones) {
    var cont = document.getElementById(idContenedor);
    var aviso = function () {
      cont.classList.add("mapa--sin");
      cont.innerHTML = '<p class="sin-mapa">El globo no cargó. Escribe la latitud y la longitud o elige una ciudad de ejemplo.</p>';
      return null;
    };
    if (typeof maplibregl === "undefined") return aviso();

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
    mapa.on("error", function (e) { console.warn("Globo:", e && e.error ? e.error.message : e); });
    raiz.Globo.mapa = mapa; // para depurar desde la consola

    return { mover: mover, mapa: mapa };
  }

  raiz.Globo = { crear: crear, celda: celda };
})(window);
