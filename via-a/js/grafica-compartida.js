// Componente compartido de la Vía B. Si no carga (servido solo desde via-a/), queda la gráfica provisional.
import {dibujarSerieAnual} from '../../compartido/serie-anual.js';
window.dibujarSerieCompartida = dibujarSerieAnual;
window.dispatchEvent(new Event('grafica-compartida'));
