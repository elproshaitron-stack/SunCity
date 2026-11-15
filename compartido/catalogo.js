(function () {
  "use strict";
  var secciones = document.getElementById("secciones");
  var indice = document.getElementById("indice");

  // 1. Estados fijos: copia cada regla de componentes.css con :hover, :focus-visible o :active
  //    cambiando la pseudoclase por [data-estado~="…"]. Así el catálogo nunca se aparta del CSS real.
  var CAMBIOS = [[/:hover/g, '[data-estado~="hover"]'], [/:focus-visible/g, '[data-estado~="foco"]'], [/:active/g, '[data-estado~="presionado"]']];
  function copiar(reglas, destino) {
    Array.prototype.forEach.call(reglas, function (r) {
      if (r.cssRules && r.media) {
        var dentro = [];
        copiar(r.cssRules, dentro);
        if (dentro.length) destino.push("@media " + r.media.mediaText + " {" + dentro.join("\n") + "}");
      } else if (r.selectorText && /:hover|:focus-visible|:active/.test(r.selectorText)) {
        var sel = r.selectorText;
        CAMBIOS.forEach(function (c) { sel = sel.replace(c[0], c[1]); });
        destino.push(sel + " {" + r.style.cssText + "}");
      }
    });
  }
  var hoja = Array.prototype.find.call(document.styleSheets, function (s) { return /componentes\.css$/.test(s.href || ""); });
  if (hoja) {
    var reglas = [];
    copiar(hoja.cssRules, reglas);
    var estilo = document.createElement("style");
    estilo.textContent = reglas.join("\n");
    document.head.appendChild(estilo);
  }

  // 2. Código a mostrar: los elementos con data-codigo, sin los atributos del catálogo
  function codigo(t) {
    var trozos = [];
    Array.prototype.forEach.call(t.content.querySelectorAll("[data-codigo]"), function (el) {
      var c = el.cloneNode(true);
      [c].concat(Array.prototype.slice.call(c.querySelectorAll("*"))).forEach(function (e) {
        e.removeAttribute("data-codigo"); e.removeAttribute("data-estado"); e.removeAttribute("data-demo");
      });
      trozos.push(c.outerHTML.replace(/=""/g, ""));
    });
    Array.prototype.forEach.call(t.content.querySelectorAll("[data-codigo-js]"), function (el) { trozos.push(el.textContent); });
    return trozos.join("\n\n");
  }

  // 3. Cada plantilla se pinta dos veces, papel y noche, con ids y nombres únicos
  function sufijar(raiz, s) {
    ["id", "name", "for", "data-sc-abre"].forEach(function (a) {
      raiz.querySelectorAll("[" + a + "]").forEach(function (e) { e.setAttribute(a, e.getAttribute(a) + s); });
    });
    ["aria-describedby", "aria-labelledby"].forEach(function (a) {
      raiz.querySelectorAll("[" + a + "]").forEach(function (e) {
        e.setAttribute(a, e.getAttribute(a).split(/\s+/).map(function (x) { return x + s; }).join(" "));
      });
    });
    // El estado forzado de un chip o segmento vive en su radio
    raiz.querySelectorAll("[data-estado]").forEach(function (e) {
      e.querySelectorAll("input").forEach(function (i) { i.setAttribute("data-estado", e.getAttribute("data-estado")); });
    });
    raiz.querySelectorAll("[data-estado], [data-estado] *").forEach(function (e) { e.setAttribute("tabindex", "-1"); e.setAttribute("aria-hidden", "true"); });
  }

  Array.prototype.forEach.call(document.querySelectorAll("template[data-id]"), function (t) {
    var id = t.dataset.id;
    var sec = document.createElement("section");
    sec.className = "cat-sec"; sec.id = id;
    sec.setAttribute("aria-labelledby", id + "-t");
    var h = document.createElement("h2"); h.id = id + "-t";
    h.textContent = t.dataset.titulo;
    var cl = document.createElement("code"); cl.textContent = t.dataset.clase; h.appendChild(cl);
    var p = document.createElement("p"); p.textContent = t.dataset.nota;
    var temas = document.createElement("div"); temas.className = "cat-temas";
    [["tema-papel", "Papel"], ["tema-noche", "Noche"]].forEach(function (par, i) {
      var caja = document.createElement("div");
      caja.className = "cat-tema " + par[0];
      caja.dataset.nombre = par[1];
      var c = t.content.cloneNode(true);
      c.querySelectorAll("[data-codigo-js]").forEach(function (e) { e.remove(); });
      caja.appendChild(c);
      sufijar(caja, i ? "-noche" : "");
      // Un diálogo hereda el tema de su caja aunque se muestre en la capa superior
      caja.querySelectorAll("dialog").forEach(function (d) { d.classList.add(par[0]); });
      temas.appendChild(caja);
    });
    var det = document.createElement("details"); det.className = "cat-codigo";
    var sum = document.createElement("summary"); sum.textContent = "Código";
    var pre = document.createElement("pre"); var co = document.createElement("code");
    co.textContent = codigo(t); pre.appendChild(co);
    det.appendChild(sum); det.appendChild(pre);
    sec.appendChild(h); sec.appendChild(p); sec.appendChild(temas); sec.appendChild(det);
    secciones.appendChild(sec);

    var li = document.createElement("li"), a = document.createElement("a");
    a.href = "#" + id; a.textContent = t.dataset.titulo; li.appendChild(a); indice.appendChild(li);
  });

  // 4. Muestrario de íconos: lee los símbolos de iconos.svg para que no haya lista que mantener
  fetch("iconos.svg").then(function (r) { return r.text(); }).then(function (texto) {
    var ids = Array.prototype.map.call(new DOMParser().parseFromString(texto, "image/svg+xml").querySelectorAll("symbol[id]"), function (s) { return s.id; });
    document.querySelectorAll("[data-iconos]").forEach(function (caja) {
      ids.forEach(function (id) {
        var f = document.createElement("figure"); f.className = "cat-estado cat-icono";
        f.innerHTML = '<svg class="sc-icono sc-icono--grande" aria-hidden="true"><use href="iconos.svg#' + id + '"/></svg><figcaption>' + id + "</figcaption>";
        caja.appendChild(f);
      });
    });
  });

  // 5. Demostraciones
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-demo]");
    if (!b || !window.SC) return;
    var d = b.dataset.demo;
    if (d === "cargando") { SC.cargando(b, true); setTimeout(function () { SC.cargando(b, false); }, 2000); }
    if (d === "toast-exito") SC.toast("Enlace copiado.");
    if (d === "toast-deshacer") SC.toast("Nombre del sector borrado.", { tipo: "deshacer", accion: { texto: "Deshacer", alHacer: function () { SC.toast("Nombre restaurado."); } } });
    if (d === "toast-error") SC.toast("No se pudo copiar el enlace.", { tipo: "error" });
    if (d === "confirmar") SC.confirmar({ titulo: "¿Borrar el nombre del sector?", texto: "Volverá a llamarse por su número.", aceptar: "Borrar nombre" })
      .then(function (si) { SC.toast(si ? "Nombre borrado." : "No se borró nada."); });
  });
  document.addEventListener("input", function (e) {
    if (e.target.dataset.demo !== "rango" || !window.SC) return;
    var v = parseFloat(e.target.value);
    SC.errorCampo(e.target, isNaN(v) || v < -180 || v > 180 ? "Escribe un valor entre −180 y 180." : null);
  });
})();
