/*
 * SunCity · Vía B · Export de Earth Engine
 * GENERADO por via-b/procesamiento/generar_script_ee.py. No editar a mano:
 * cambiar la plantilla o los parámetros y volver a generar.
 *
 * Uso: pegar todo en https://code.earthengine.google.com, pulsar Run,
 * luego en la pestaña Tasks pulsar Run en las tres tareas. Los CSV llegan a
 * Google Drive, carpeta SunCity. Bajarlos a via-b/datos/reales/export/.
 *
 * Productos verificados en el catálogo el 14 nov 2026:
 *   MODIS/061/MOD11A2, MYD11A2: LST_Day_1km, LST_Night_1km (escala 0.02 K), QC_Day, QC_Night
 *   MODIS/061/MOD21A1D, MOD21A1N, MYD21A1D, MYD21A1N: LST_1KM (K), QC
 *   YALE/YCEO/UHI/UHI_yearly_pixel/v4: Daytime, Nighttime (°C), 2003-2018
 *   CIESIN/GPWv411/GPW_Population_Count: population_count (2020)
 *   MODIS/061/MOD13A2: NDVI (escala 0.0001)
 */

// ---------- Parámetros (vienen de generar_script_ee.py) ----------
var POLIGONOS = ee.FeatureCollection({"type":"FeatureCollection","features":[{"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[-111.015,29.028],[-110.983,29.028],[-110.983,29.055999999999997],[-111.015,29.055999999999997],[-111.015,29.028]]]},"properties":{"id":"S01","tipo":"sector"}},{"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[-110.983,29.028],[-110.95100000000001,29.028],[-110.95100000000001,29.055999999999997],[-110.983,29.055999999999997],[-110.983,29.028]]]},"properties":{"id":"S02","tipo":"sector"}},{"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[-111.015,29.055999999999997],[-110.983,29.055999999999997],[-110.983,29.083999999999996],[-111.015,29.083999999999996],[-111.015,29.055999999999997]]]},"properties":{"id":"S03","tipo":"sector"}},{"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[-110.983,29.055999999999997],[-110.95100000000001,29.055999999999997],[-110.95100000000001,29.083999999999996],[-110.983,29.083999999999996],[-110.983,29.055999999999997]]]},"properties":{"id":"S04","tipo":"sector"}},{"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[-111.015,29.084],[-110.983,29.084],[-110.983,29.112],[-111.015,29.112],[-111.015,29.084]]]},"properties":{"id":"S05","tipo":"sector"}},{"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[-110.983,29.084],[-110.95100000000001,29.084],[-110.95100000000001,29.112],[-110.983,29.112],[-110.983,29.084]]]},"properties":{"id":"S06","tipo":"sector"}},{"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[-111.17,29.01],[-111.135,29.01],[-111.135,29.040000000000003],[-111.17,29.040000000000003],[-111.17,29.01]]]},"properties":{"id":"RA","tipo":"referencia"}},{"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[-111.17,29.1],[-111.135,29.1],[-111.135,29.130000000000003],[-111.17,29.130000000000003],[-111.17,29.1]]]},"properties":{"id":"RB","tipo":"referencia"}}]});
var ANIO_INICIO = 2001;
var ANIO_FIN = 2025;
var MES_INICIO = 6;   // temporada: meses consecutivos, DECISIONES.md
var MES_FIN = 8;
var CARPETA = 'SunCity';

// ---------- Calidad ----------
function bits(img, desde, hasta) {
  var mascara = Math.pow(2, hasta - desde + 1) - 1;
  return img.rightShift(desde).bitwiseAnd(mascara);
}

// MOD11: bits 0-1 = 0, o bits 0-1 = 1 con error de LST <= 2 K (bits 6-7 en 0 o 1)
function lstMOD11(img, banda, qc) {
  var q = img.select(qc);
  var calidad = bits(q, 0, 1);
  var error = bits(q, 6, 7);
  var ok = calidad.eq(0).or(calidad.eq(1).and(error.lte(1)));
  var lst = img.select(banda);
  return lst.updateMask(ok).updateMask(lst.gt(0)).multiply(0.02).toFloat().rename('lst');
}

// MOD21: bits 0-1 en 0 (bueno) o 1 (nominal). Se exporta tal cual: procesar.py
// detecta si los valores vienen sin escalar (> 400) y aplica 0.02.
function lstMOD21(img) {
  var calidad = bits(img.select('QC'), 0, 1);
  var lst = img.select('LST_1KM');
  return lst.updateMask(calidad.lte(1)).updateMask(lst.gt(0)).toFloat().rename('lst');
}

var PRODUCTOS = [
  {id: 'MOD11_Terra_dia',   col: 'MODIS/061/MOD11A2',  alg: 'MOD11', sat: 'Terra', paso: '10:30', f: function (i) { return lstMOD11(i, 'LST_Day_1km', 'QC_Day'); }},
  {id: 'MOD11_Terra_noche', col: 'MODIS/061/MOD11A2',  alg: 'MOD11', sat: 'Terra', paso: '22:30', f: function (i) { return lstMOD11(i, 'LST_Night_1km', 'QC_Night'); }},
  {id: 'MOD11_Aqua_dia',    col: 'MODIS/061/MYD11A2',  alg: 'MOD11', sat: 'Aqua',  paso: '13:30', f: function (i) { return lstMOD11(i, 'LST_Day_1km', 'QC_Day'); }},
  {id: 'MOD11_Aqua_noche',  col: 'MODIS/061/MYD11A2',  alg: 'MOD11', sat: 'Aqua',  paso: '01:30', f: function (i) { return lstMOD11(i, 'LST_Night_1km', 'QC_Night'); }},
  {id: 'MOD21_Terra_dia',   col: 'MODIS/061/MOD21A1D', alg: 'MOD21', sat: 'Terra', paso: '10:30', f: lstMOD21},
  {id: 'MOD21_Terra_noche', col: 'MODIS/061/MOD21A1N', alg: 'MOD21', sat: 'Terra', paso: '22:30', f: lstMOD21},
  {id: 'MOD21_Aqua_dia',    col: 'MODIS/061/MYD21A1D', alg: 'MOD21', sat: 'Aqua',  paso: '13:30', f: lstMOD21},
  {id: 'MOD21_Aqua_noche',  col: 'MODIS/061/MYD21A1N', alg: 'MOD21', sat: 'Aqua',  paso: '01:30', f: lstMOD21}
];

// lst_mean: media de la temporada sobre píxeles válidos; lst_count: píxeles con dato;
// nobs_mean: observaciones válidas promedio por píxel; uno_count: píxeles del polígono.
var REDUCTOR = ee.Reducer.mean().combine({reducer2: ee.Reducer.count(), sharedInputs: true});

function filaAnual(p, anio) {
  anio = ee.Number(anio);
  var col = ee.ImageCollection(p.col)
    .filter(ee.Filter.calendarRange(anio, anio, 'year'))
    .filter(ee.Filter.calendarRange(MES_INICIO, MES_FIN, 'month'));
  // Imagen totalmente enmascarada: si un año no tiene imágenes (Aqua en 2001), mean() no queda
  // sin bandas; no cambia la media ni el conteo porque no aporta píxeles.
  var vacia = ee.Image.constant(0).toFloat().rename('lst').updateMask(ee.Image.constant(0));
  var lst = col.map(function (i) { return p.f(i).toFloat(); }).merge(ee.ImageCollection([vacia]));
  var img = lst.mean().rename('lst')
    .addBands(lst.count().unmask(0).rename('nobs'))
    .addBands(ee.Image.constant(1).rename('uno'));
  var proj = ee.ImageCollection(p.col).first().projection();
  var nImg = col.size();
  return img.reduceRegions({collection: POLIGONOS, reducer: REDUCTOR, crs: proj, scale: 1000})
    .map(function (f) {
      return ee.Feature(null, {
        poligono: f.get('id'), tipo: f.get('tipo'),
        producto: p.id, algoritmo: p.alg, satelite: p.sat, paso: p.paso, anio: anio,
        lst_k: f.get('lst_mean'), pix_validos: f.get('lst_count'),
        pix_total: f.get('uno_count'), obs_media: f.get('nobs_mean'), n_imagenes: nImg
      });
    });
}

var anios = ee.List.sequence(ANIO_INICIO, ANIO_FIN);
var tablaLST = ee.FeatureCollection(PRODUCTOS.map(function (p) {
  return ee.FeatureCollection(anios.map(function (a) { return filaAnual(p, a); })).flatten();
})).flatten();

Export.table.toDrive({
  collection: tablaLST, description: 'suncity_lst', folder: CARPETA, fileFormat: 'CSV',
  selectors: ['poligono', 'tipo', 'producto', 'algoritmo', 'satelite', 'paso', 'anio',
              'lst_k', 'pix_validos', 'pix_total', 'obs_media', 'n_imagenes']
});

// ---------- Yale: islas de calor por año (mismo MODIS; coteja método, no sensor) ----------
var yale = ee.ImageCollection('YALE/YCEO/UHI/UHI_yearly_pixel/v4');
var tablaYale = yale.map(function (img) {
  var anio = ee.Algorithms.If(img.get('system:time_start'),
    ee.Date(img.get('system:time_start')).get('year'), img.get('system:index'));
  return img.select(['Daytime', 'Nighttime'])
    .reduceRegions({collection: POLIGONOS, reducer: ee.Reducer.mean(), scale: 300})
    .map(function (f) {
      return ee.Feature(null, {poligono: f.get('id'), tipo: f.get('tipo'), anio: anio,
        yale_dia_c: f.get('Daytime'), yale_noche_c: f.get('Nighttime')});
    });
}).flatten();

Export.table.toDrive({
  collection: tablaYale, description: 'suncity_yale', folder: CARPETA, fileFormat: 'CSV',
  selectors: ['poligono', 'tipo', 'anio', 'yale_dia_c', 'yale_noche_c']
});

// ---------- Extras por polígono: población 2020 y NDVI de la temporada ----------
var poblacion = ee.ImageCollection('CIESIN/GPWv411/GPW_Population_Count')
  .filter(ee.Filter.calendarRange(2020, 2020, 'year')).first().select('population_count');
var ndvi = ee.ImageCollection('MODIS/061/MOD13A2')
  .filter(ee.Filter.calendarRange(2001, 2019, 'year'))
  .filter(ee.Filter.calendarRange(MES_INICIO, MES_FIN, 'month'))
  .select('NDVI').mean().multiply(0.0001);

var conPob = poblacion.reduceRegions({collection: POLIGONOS, reducer: ee.Reducer.sum(), scale: 927.67});
var tablaExtra = ndvi.reduceRegions({collection: conPob, reducer: ee.Reducer.mean().setOutputs(['ndvi']), scale: 1000})
  .map(function (f) {
    return ee.Feature(null, {poligono: f.get('id'), tipo: f.get('tipo'),
      poblacion_2020: f.get('sum'), ndvi_temporada: f.get('ndvi'), area_km2: f.geometry().area(1).divide(1e6)});
  });

Export.table.toDrive({
  collection: tablaExtra, description: 'suncity_extra', folder: CARPETA, fileFormat: 'CSV',
  selectors: ['poligono', 'tipo', 'poblacion_2020', 'ndvi_temporada', 'area_km2']
});

// ---------- Vista rápida para revisar polígonos antes de exportar ----------
Map.centerObject(POLIGONOS, 11);
Map.addLayer(POLIGONOS, {color: 'ff6600'}, 'Polígonos SunCity');
print('Polígonos', POLIGONOS.size(), 'Filas LST esperadas', PRODUCTOS.length * (ANIO_FIN - ANIO_INICIO + 1) * 8);
print('Muestra LST', tablaLST.limit(5));
