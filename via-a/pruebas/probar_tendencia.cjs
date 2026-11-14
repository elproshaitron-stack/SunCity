/*
 * Prueba de aceptación: la misma serie da lo mismo en JavaScript y en Python,
 * a tres decimales (pendiente, intervalo y p de Mann-Kendall).
 *
 * Uso:
 *   python via-a/pruebas/generar_casos.py
 *   node via-a/pruebas/probar_tendencia.cjs
 */
const path = require("path");
const fs = require("fs");
const T = require(path.join(__dirname, "..", "js", "tendencia.js"));

const casos = JSON.parse(fs.readFileSync(path.join(__dirname, "casos.json"), "utf8"));
const TOL = 0.0005; // coincide a tres decimales
const campos = ["pendiente_c_decada", "ic95_inf", "ic95_sup", "p_mk"];
let fallos = 0, peor = { dif: 0 };

for (const c of casos) {
  const r = T.tendencia(c.anios, c.valores, 3);
  if (r.n_anios !== c.esperado.n_anios) {
    fallos++; console.log(`FALLA ${c.nombre}: n_anios ${r.n_anios} vs ${c.esperado.n_anios}`);
    continue;
  }
  for (const k of campos) {
    const e = c.esperado[k], g = r[k];
    if (e === null && isNaN(g)) continue;
    const dif = Math.abs(g - e);
    if (dif > peor.dif) peor = { dif, caso: c.nombre, campo: k };
    if (!(dif <= TOL)) {
      fallos++;
      console.log(`FALLA ${c.nombre} ${k}: JS ${g} vs Python ${e}`);
    }
  }
}

console.log(`${casos.length} casos, ${fallos} fallos. Diferencia máxima ${peor.dif.toExponential(2)}` +
  (peor.caso ? ` (${peor.caso}, ${peor.campo})` : ""));
process.exit(fallos ? 1 : 0);
