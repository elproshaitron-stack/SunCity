/*
 * Muestra docs/METODO.md. Lector de Markdown mínimo, solo para lo que usa ese archivo:
 * títulos, párrafos, listas, tablas, negritas, cursivas, código y enlaces. Todo el texto se escapa
 * antes de aplicar el formato, así que el archivo no puede inyectar HTML.
 */
(function () {
  "use strict";
  var FUENTE = "../docs/METODO.md";
  var texto = document.getElementById("texto");
  var contenido = document.getElementById("contenido");

  function escapar(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function enLinea(s) {
    var codigos = [];
    s = escapar(s).replace(/`([^`]+)`/g, function (_, c) { codigos.push(c); return "\u0000" + (codigos.length - 1) + "\u0000"; });
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, t, href) {
      var url = new URL(href.replace(/&amp;/g, "&"), new URL(FUENTE, location.href));
      var externo = url.origin !== location.origin;
      // Los otros documentos de docs/ se abren como archivo; el propio método no se enlaza a sí mismo
      return '<a href="' + escapar(url.href) + '"' + (externo ? ' rel="noopener"' : "") + ">" + t + "</a>";
    });
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\*([^*]+)\*/g, "<em>$1</em>");
    return s.replace(/\u0000(\d+)\u0000/g, function (_, i) { return "<code>" + codigos[+i] + "</code>"; });
  }
  function slug(s) {
    return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }
  function celdas(linea) { return linea.trim().replace(/^\||\|$/g, "").split("|").map(function (c) { return c.trim(); }); }

  function convertir(md) {
    var lineas = md.replace(/\r/g, "").split("\n");
    var html = [], i = 0, primerParrafo = true, usados = {};
    while (i < lineas.length) {
      var l = lineas[i];
      if (!l.trim()) { i++; continue; }
      var h = /^(#{1,3})\s+(.*)$/.exec(l);
      if (h) {
        var nivel = h[1].length;
        if (nivel > 1) {
          var id = slug(h[2]); if (usados[id]) id += "-" + (++usados[id]); else usados[id] = 1;
          html.push("<h" + nivel + ' id="' + id + '">' + enLinea(h[2]) + "</h" + nivel + ">");
        }
        i++; continue; // el h1 ya está en la página
      }
      if (/^\|/.test(l) && i + 1 < lineas.length && /^\|\s*:?-/.test(lineas[i + 1])) {
        var cab = celdas(l); i += 2;
        var filas = [];
        while (i < lineas.length && /^\|/.test(lineas[i])) { filas.push(celdas(lineas[i])); i++; }
        var t = '<div class="sc-tabla-marco"><table class="sc-tabla sc-tabla--tarjetas"><thead><tr>' +
          cab.map(function (c) { return '<th scope="col">' + enLinea(c) + "</th>"; }).join("") + "</tr></thead><tbody>" +
          filas.map(function (f) {
            // La primera columna nombra la fila: es su encabezado
            return "<tr>" + f.map(function (c, k) {
              if (k === 0) return '<th scope="row">' + enLinea(c) + "</th>";
              return '<td data-etiqueta="' + escapar(cab[k] || "") + '">' + enLinea(c) + "</td>";
            }).join("") + "</tr>";
          }).join("") + "</tbody></table></div>";
        html.push(t); continue;
      }
      var lista = /^(\s*)([-*]|\d+\.)\s+/.exec(l);
      if (lista) {
        var ordenada = /\d/.test(lista[2]), items = [];
        while (i < lineas.length && /^\s*([-*]|\d+\.)\s+/.test(lineas[i])) { items.push(lineas[i].replace(/^\s*([-*]|\d+\.)\s+/, "")); i++; }
        var tag = ordenada ? "ol" : "ul";
        html.push("<" + tag + ">" + items.map(function (x) { return "<li>" + enLinea(x) + "</li>"; }).join("") + "</" + tag + ">");
        continue;
      }
      var parrafo = [];
      while (i < lineas.length && lineas[i].trim() && !/^(#|\||\s*([-*]|\d+\.)\s)/.test(lineas[i])) { parrafo.push(lineas[i].trim()); i++; }
      // El primer párrafo habla del archivo y de los documentos técnicos: en la página va como nota al final
      if (primerParrafo) { primerParrafo = false; html.unshift('<p class="entrada">Cómo calcula SunCity, cómo leer un resultado y qué no puede decir. Al final están las fuentes y los documentos técnicos.</p>'); html.push('<aside class="sc-aviso" id="nota-fuente"><p class="sc-aviso__texto">' + enLinea(parrafo.join(" ")) + "</p></aside>"); continue; }
      html.push("<p>" + enLinea(parrafo.join(" ")) + "</p>");
    }
    return html.join("\n");
  }

  function indice() {
    var lista = document.getElementById("indice");
    var h2s = Array.prototype.slice.call(texto.querySelectorAll("h2"));
    h2s.forEach(function (h) {
      var li = document.createElement("li"), a = document.createElement("a");
      a.href = "#" + h.id; a.textContent = h.textContent; li.appendChild(a); lista.appendChild(li);
    });
    // Marca en el índice la sección que se está leyendo: la última cuyo título ya pasó el tercio de la pantalla
    var enlaces = Array.prototype.slice.call(lista.querySelectorAll("a"));
    var pendiente = false;
    function marcar() {
      pendiente = false;
      var actual = h2s[0];
      h2s.forEach(function (h) { if (h.getBoundingClientRect().top < innerHeight / 3) actual = h; });
      enlaces.forEach(function (a) {
        if (a.getAttribute("href") === "#" + actual.id) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      });
    }
    addEventListener("scroll", function () { if (!pendiente) { pendiente = true; requestAnimationFrame(marcar); } }, { passive: true });
    marcar();
  }

  document.getElementById("indice-detalle").open = !matchMedia("(max-width: 900px)").matches;
  fetch(FUENTE)
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
    .then(function (md) {
      texto.innerHTML = convertir(md);
      // La nota sobre el archivo fuente va al final, antes del pie
      var nota = document.getElementById("nota-fuente"); if (nota) texto.appendChild(nota);
      contenido.removeAttribute("aria-busy");
      indice();
      if (location.hash) { var destino = document.getElementById(location.hash.slice(1)); if (destino) destino.scrollIntoView(); }
    })
    .catch(function () {
      contenido.removeAttribute("aria-busy");
      texto.innerHTML = '<div class="sc-aviso sc-aviso--error" role="alert"><p class="sc-aviso__titulo">No se pudo cargar el método</p>' +
        '<p class="sc-aviso__texto">Revisa tu conexión y vuelve a intentarlo, o lee el archivo <a href="' + FUENTE + '">docs/METODO.md</a> directamente.</p>' +
        '<div class="sc-aviso__acciones"><button class="sc-boton sc-boton--secundario sc-boton--compacto" type="button" id="metodo-reintentar">Reintentar</button></div></div>';
      document.getElementById("metodo-reintentar").addEventListener("click", function () { location.reload(); });
    });
})();
