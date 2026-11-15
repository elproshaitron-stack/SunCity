// Ruta relativa a via-b/. Todos los archivos de datos se buscan en esta carpeta.
// 'datos/reales/' sale de via-b/procesamiento (exportar_gibs.py o el export de Earth Engine, y procesar.py).
// 'datos/prueba/' son los datos sintéticos de generar_prueba.py.
export const RUTA_DATOS = 'datos/reales/';
export const datosDePrueba = RUTA_DATOS === 'datos/prueba/';
// D15 abierta: los polígonos de los sectores y las referencias siguen siendo los esquemáticos de prueba.
// Mientras sea true, la página avisa que las temperaturas son reales pero los polígonos no.
export const poligonosEsquematicos = true;
// D04 cerrada: rango MOD11-MOD21 en los cuatro pasos. Con datos de NASA GIBS (D18) no hay MOD21 y el
// ciclo diario muestra solo MOD11; las pruebas de aceptación lo marcan como faltante.
export const pasosAqua = 'rango';
// Sector cuyo expediente muestra el zoom de ECOSTRESS (D10, AppEEARS; aún sin datos reales).
export const sectorPrioritario = 'S01';
