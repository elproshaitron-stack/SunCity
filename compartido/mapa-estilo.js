/*
 * SunCity · Estilo de mapa común (MapLibre GL JS)
 * Un solo estilo para el globo de la Vía A y el plano de la Vía B: tierra de arena,
 * agua de noche, ciudad en tono tostado, caminos y nombres en español.
 * Mosaicos vectoriales de OpenFreeMap (esquema OpenMapTiles), sin clave.
 *
 *   var estilo = MapaEstilo.base({ proyeccion: "globe" });     // o "mercator"
 *   MapaEstilo.insertarAntes(estilo, MapaEstilo.PRIMER_NOMBRE, capas)  // capas propias bajo los nombres
 *
 * Las capas de detalle urbano (calles, barrios) solo aparecen de cerca (zoom 11.5 o más),
 * así el globo, que llega a zoom 11, se ve igual que antes.
 */
(function (raiz) {
  "use strict";

  var NOMBRE = ["coalesce", ["get", "name:es"], ["get", "name:latin"], ["get", "name"]];
  var HALO = "rgba(236, 216, 180, .9)";

  var COLOR = {
    tierra: "#dcc195",
    vegetacion: "#b9ad7c",
    hielo: "#f4efe4",
    ciudad: "#b98f62",
    agua: "#12224a",
    camino: "#8a6b47",
    calle: "#9c7d58",
    limite: "#6e5132",
    texto: "#3a2a18",
    textoFuerte: "#4a3520",
    cielo: "#0a1024",
    horizonte: "#f2b27a"
  };

  var ATRIBUCION = '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> © ' +
    '<a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> Datos de ' +
    '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';

  function base(opciones) {
    opciones = opciones || {};
    var globo = opciones.proyeccion === "globe";
    var estilo = {
      version: 8,
      projection: { type: globo ? "globe" : "mercator" },
      glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
      sources: {
        omt: { type: "vector", url: "https://tiles.openfreemap.org/planet", attribution: ATRIBUCION }
      },
      layers: [
        { id: "tierra", type: "background", paint: { "background-color": COLOR.tierra } },
        { id: "vegetacion", type: "fill", source: "omt", "source-layer": "landcover",
          filter: ["in", ["get", "class"], ["literal", ["wood", "grass", "farmland"]]],
          paint: { "fill-color": COLOR.vegetacion, "fill-opacity": 0.55 } },
        { id: "hielo", type: "fill", source: "omt", "source-layer": "landcover",
          filter: ["==", ["get", "class"], "ice"],
          paint: { "fill-color": COLOR.hielo } },
        { id: "ciudad", type: "fill", source: "omt", "source-layer": "landuse", minzoom: 6,
          filter: ["in", ["get", "class"], ["literal", ["residential", "commercial", "industrial"]]],
          paint: { "fill-color": COLOR.ciudad, "fill-opacity": 0.6 } },
        { id: "agua", type: "fill", source: "omt", "source-layer": "water",
          paint: { "fill-color": COLOR.agua } },
        { id: "rios", type: "line", source: "omt", "source-layer": "waterway", minzoom: 6,
          paint: { "line-color": COLOR.agua, "line-width": 1 } },
        // Detalle urbano: solo de cerca
        { id: "calles", type: "line", source: "omt", "source-layer": "transportation", minzoom: 11.5,
          filter: ["in", ["get", "class"], ["literal", ["secondary", "tertiary", "minor"]]],
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": COLOR.calle, "line-opacity": 0.45,
            "line-width": ["interpolate", ["linear"], ["zoom"], 11.5, 0.4, 15, 2] } },
        { id: "caminos", type: "line", source: "omt", "source-layer": "transportation", minzoom: 6,
          filter: ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary"]]],
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": COLOR.camino, "line-opacity": 0.55,
            "line-width": ["interpolate", ["linear"], ["zoom"], 6, 0.6, 11, 2.2, 15, 4] } },
        { id: "estados", type: "line", source: "omt", "source-layer": "boundary", minzoom: 3,
          filter: ["all", ["==", ["get", "admin_level"], 4], ["!=", ["get", "maritime"], 1]],
          paint: { "line-color": COLOR.camino, "line-opacity": 0.6, "line-width": 0.7, "line-dasharray": [3, 2] } },
        { id: "paises", type: "line", source: "omt", "source-layer": "boundary",
          filter: ["all", ["==", ["get", "admin_level"], 2], ["!=", ["get", "maritime"], 1]],
          paint: { "line-color": COLOR.limite,
            "line-width": ["interpolate", ["linear"], ["zoom"], 0, 0.5, 6, 1.4] } },
        { id: "nombre-barrio", type: "symbol", source: "omt", "source-layer": "place", minzoom: 11.5,
          filter: ["in", ["get", "class"], ["literal", ["suburb", "neighbourhood", "quarter"]]],
          layout: { "text-field": NOMBRE, "text-font": ["Noto Sans Regular"], "text-size": 11,
            "text-max-width": 8, "text-transform": "uppercase", "text-letter-spacing": 0.06 },
          paint: { "text-color": COLOR.texto, "text-opacity": 0.75, "text-halo-color": HALO, "text-halo-width": 1.2 } },
        { id: "nombre-pueblo", type: "symbol", source: "omt", "source-layer": "place", minzoom: 11.5,
          filter: ["==", ["get", "class"], "town"],
          layout: { "text-field": NOMBRE, "text-font": ["Noto Sans Regular"], "text-size": 12, "text-max-width": 8 },
          paint: { "text-color": COLOR.texto, "text-halo-color": HALO, "text-halo-width": 1.4 } },
        { id: "nombre-ciudad", type: "symbol", source: "omt", "source-layer": "place", minzoom: 4,
          filter: ["all", ["==", ["get", "class"], "city"],
            ["<=", ["get", "rank"], ["interpolate", ["linear"], ["zoom"], 4, 3, 7, 9, 9, 20]]],
          layout: { "text-field": NOMBRE, "text-font": ["Noto Sans Regular"],
            "text-size": ["interpolate", ["linear"], ["zoom"], 4, 11, 9, 15], "text-max-width": 8 },
          paint: { "text-color": COLOR.texto, "text-halo-color": HALO, "text-halo-width": 1.4 } },
        { id: "nombre-pais", type: "symbol", source: "omt", "source-layer": "place", maxzoom: 7,
          filter: ["all", ["==", ["get", "class"], "country"],
            ["<=", ["get", "rank"], ["interpolate", ["linear"], ["zoom"], 1, 1, 3, 3, 5, 6]]],
          layout: { "text-field": NOMBRE, "text-font": ["Noto Sans Bold"], "text-transform": "uppercase",
            "text-letter-spacing": 0.12, "text-max-width": 7,
            "text-size": ["interpolate", ["linear"], ["zoom"], 1, 9, 5, 14] },
          paint: { "text-color": COLOR.textoFuerte, "text-halo-color": "rgba(236, 216, 180, .85)", "text-halo-width": 1.2 } }
      ]
    };
    if (globo) {
      estilo.sky = {
        "sky-color": COLOR.cielo,
        "horizon-color": COLOR.horizonte,
        "fog-color": COLOR.cielo,
        "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 3, 1, 5, 0]
      };
      estilo.light = { anchor: "map", position: [1.5, 90, 80] };
    }
    return estilo;
  }

  // Inserta capas propias justo antes de la capa con ese id (por defecto, bajo los nombres)
  function insertarAntes(estilo, id, capas) {
    var i = estilo.layers.findIndex(function (c) { return c.id === id; });
    if (i < 0) i = estilo.layers.length;
    Array.prototype.splice.apply(estilo.layers, [i, 0].concat(capas));
    return estilo;
  }

  raiz.MapaEstilo = {
    base: base,
    insertarAntes: insertarAntes,
    COLOR: COLOR,
    PRIMER_NOMBRE: "nombre-barrio",
    // Para capas de datos que deben quedar bajo calles y caminos
    PRIMERA_LINEA: "rios"
  };
})(window);
