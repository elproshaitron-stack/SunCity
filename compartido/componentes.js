/*
 * SunCity · Comportamiento de los componentes
 * Ver docs/07-PLAN-DE-CIERRE.md, 4.2 y 5. Sin dependencias; script clásico.
 *
 *   <script src="../compartido/componentes.js" defer></script>
 *
 * Expone window.SC:
 *   SC.abrir(dialogo, disparador?)        abre una sc-hoja o un sc-dialogo como modal
 *   SC.confirmar({titulo, texto, aceptar, cancelar})  → Promise<boolean>
 *   SC.toast(texto, {tipo, accion, duracion})         tipo: exito | deshacer | error
 *   SC.cargando(boton, siONo)             estado cargando de un sc-boton
 *   SC.errorCampo(control, mensaje|null)  muestra o quita el error de un sc-campo
 *   SC.ordenarTabla(tabla)                activa el orden de una sc-tabla (automático con data-sc-ordenable)
 *
 * Y dos elementos propios, en DOM normal para que los estilen tokens y componentes:
 *   <sc-barra raiz="../" actual="via-a" contenido="resultado"><a href="../">SunCity</a></sc-barra>
 *   <sc-pie raiz="../" datos="NASA POWER 2025-10" software="0.9.0"></sc-pie>
 * Lo que va dentro es la alternativa sin JavaScript: un enlace simple a la portada.
 *
 * Atributos declarativos:
 *   data-sc-abre="id"   en un botón: abre el diálogo o la hoja con ese id
 *   data-sc-cierra      en un botón dentro de un diálogo: lo cierra
 */
(function (raiz) {
  "use strict";

  var SC = raiz.SC = raiz.SC || {};
  var doc = raiz.document;

  function porId(x) { return typeof x === "string" ? doc.getElementById(x) : x; }
  function crear(etiqueta, clase, texto) {
    var el = doc.createElement(etiqueta);
    if (clase) el.className = clase;
    if (texto != null) el.textContent = texto;
    return el;
  }
  var cuenta = 0;
  function idNuevo(prefijo) { cuenta += 1; return prefijo + "-" + cuenta; }

  /* ── Hoja y diálogo ──────────────────────────────────────────────
     Usan <dialog> con showModal(): el navegador atrapa el foco y cierra con Escape.
     Aquí: recordar quién abrió, devolverle el foco al cerrar y cerrar al tocar el velo. */

  var origen = new WeakMap();

  SC.abrir = function (dialogo, disparador) {
    dialogo = porId(dialogo);
    if (!dialogo || dialogo.open) return;
    origen.set(dialogo, disparador || doc.activeElement);
    if (!dialogo.dataset.scListo) {
      dialogo.dataset.scListo = "1";
      dialogo.addEventListener("close", function () {
        var quien = origen.get(dialogo);
        origen.delete(dialogo);
        if (quien && quien.isConnected && typeof quien.focus === "function") quien.focus();
      });
      // Un clic en el velo (fuera de la caja) cierra
      dialogo.addEventListener("click", function (e) {
        if (e.target !== dialogo) return;
        var r = dialogo.getBoundingClientRect();
        var fuera = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
        if (fuera) dialogo.close("velo");
      });
    }
    dialogo.showModal();
    // En un diálogo de confirmación el foco inicial va en Cancelar (o en el autofocus que haya)
    var inicial = dialogo.querySelector("[autofocus]") ||
      (dialogo.classList.contains("sc-dialogo") && dialogo.querySelector("[data-sc-cierra]"));
    if (inicial) inicial.focus();
  };

  SC.confirmar = function (op) {
    op = op || {};
    return new Promise(function (resolver) {
      var d = crear("dialog", "sc-dialogo");
      var idT = idNuevo("sc-dlg-t"), idX = idNuevo("sc-dlg-x");
      d.setAttribute("aria-labelledby", idT);
      var t = crear("h2", "sc-dialogo__titulo", op.titulo || "¿Continuar?"); t.id = idT;
      d.appendChild(t);
      if (op.texto) { var x = crear("p", "sc-dialogo__texto", op.texto); x.id = idX; d.setAttribute("aria-describedby", idX); d.appendChild(x); }
      var acc = crear("div", "sc-dialogo__acciones");
      var si = crear("button", "sc-boton sc-boton--primario", op.aceptar || "Continuar");
      var no = crear("button", "sc-boton sc-boton--secundario", op.cancelar || "Cancelar");
      si.type = no.type = "button";
      no.setAttribute("data-sc-cierra", "");
      si.addEventListener("click", function () { d.close("si"); });
      acc.appendChild(si); acc.appendChild(no); // en pantalla: Cancelar a la izquierda por wrap-reverse
      d.appendChild(acc);
      d.addEventListener("close", function () {
        resolver(d.returnValue === "si");
        setTimeout(function () { d.remove(); }, 0);
      });
      doc.body.appendChild(d);
      SC.abrir(d);
      no.focus();
    });
  };

  doc.addEventListener("click", function (e) {
    var abre = e.target.closest && e.target.closest("[data-sc-abre]");
    if (abre) { e.preventDefault(); SC.abrir(abre.getAttribute("data-sc-abre"), abre); return; }
    var cierra = e.target.closest && e.target.closest("[data-sc-cierra]");
    if (cierra) { var d = cierra.closest("dialog"); if (d) d.close("cancelar"); }
  });

  /* ── Toast ──────────────────────────────────────────────────────
     Dos regiones: una cortés para éxito y deshacer, otra de alerta para errores.
     Éxito se va solo a los 5 s, deshacer a los 8 s, error nunca. Pasar el cursor
     o enfocar un toast detiene su cuenta. */

  var regiones = null;
  function prepararRegiones() {
    if (regiones) return false;
    var caja = crear("div", "sc-toasts");
    var cortes = crear("div", "sc-toasts__region"); cortes.setAttribute("aria-live", "polite");
    var alerta = crear("div", "sc-toasts__region"); alerta.setAttribute("role", "alert");
    caja.appendChild(cortes); caja.appendChild(alerta);
    doc.body.appendChild(caja);
    regiones = { cortes: cortes, alerta: alerta };
    return true;
  }

  function quitar(t) {
    if (t.dataset.saliendo) return;
    t.dataset.saliendo = "1";
    setTimeout(function () { t.remove(); }, 250);
  }

  SC.toast = function (texto, op) {
    op = op || {};
    var tipo = op.tipo || "exito";
    var recien = prepararRegiones();
    var t = crear("div", "sc-toast" + (tipo !== "exito" ? " sc-toast--" + tipo : ""));
    t.appendChild(crear("p", "sc-toast__texto", texto));
    if (op.accion) {
      var b = crear("button", "sc-boton sc-boton--texto sc-boton--compacto", op.accion.texto);
      b.type = "button";
      b.addEventListener("click", function () { if (op.accion.alHacer) op.accion.alHacer(); quitar(t); });
      t.appendChild(b);
    }
    if (tipo === "error" || op.cerrable) {
      var c = crear("button", "sc-boton sc-boton--texto sc-boton--compacto", "Cerrar");
      c.type = "button";
      c.addEventListener("click", function () { quitar(t); });
      t.appendChild(c);
    }
    var duracion = op.duracion != null ? op.duracion : (tipo === "error" ? 0 : tipo === "deshacer" ? 8000 : 5000);
    if (duracion > 0) {
      var reloj = null, resta = duracion, desde = 0;
      var corre = function () { desde = Date.now(); reloj = setTimeout(function () { quitar(t); }, resta); };
      var para = function () { if (reloj) { clearTimeout(reloj); reloj = null; resta -= Date.now() - desde; } };
      t.addEventListener("mouseenter", para); t.addEventListener("focusin", para);
      t.addEventListener("mouseleave", corre); t.addEventListener("focusout", corre);
      corre();
    }
    var region = tipo === "error" ? regiones.alerta : regiones.cortes;
    // Una región recién creada necesita un momento para que el lector de pantalla la registre
    if (recien) setTimeout(function () { region.appendChild(t); }, 120);
    else region.appendChild(t);
    return { cerrar: function () { quitar(t); } };
  };

  /* ── Botón cargando ───────────────────────────────────────────── */

  SC.cargando = function (boton, si) {
    boton = porId(boton);
    if (!boton) return;
    if (si) {
      // El texto suelto va en un span para que el CSS lo oculte sin cambiar el ancho
      Array.prototype.slice.call(boton.childNodes).forEach(function (n) {
        if (n.nodeType === 3 && n.textContent.trim()) { var s = crear("span"); n.replaceWith(s); s.appendChild(n); }
      });
      boton.setAttribute("aria-busy", "true");
      boton.setAttribute("aria-disabled", "true");
    } else {
      boton.removeAttribute("aria-busy");
      boton.removeAttribute("aria-disabled");
    }
  };
  // Un botón ocupado o deshabilitado con aria no dispara su acción
  doc.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest('.sc-boton[aria-disabled="true"]');
    if (b) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);

  /* ── Error de campo ───────────────────────────────────────────── */

  SC.errorCampo = function (control, mensaje) {
    control = porId(control);
    if (!control) return;
    var campo = control.closest(".sc-campo") || control.parentElement;
    var p = campo.querySelector(".sc-campo__error");
    var ids = (control.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean);
    if (mensaje) {
      if (!p) { p = crear("p", "sc-campo__error"); p.id = idNuevo((control.id || "sc-campo") + "-error"); campo.appendChild(p); }
      p.textContent = mensaje;
      p.hidden = false;
      if (ids.indexOf(p.id) < 0) ids.push(p.id);
      control.setAttribute("aria-invalid", "true");
    } else {
      control.removeAttribute("aria-invalid");
      if (p) { p.hidden = true; ids = ids.filter(function (i) { return i !== p.id; }); }
    }
    if (ids.length) control.setAttribute("aria-describedby", ids.join(" "));
    else control.removeAttribute("aria-describedby");
  };

  /* ── Segmento ─────────────────────────────────────────────────────
     Las flechas ya mueven la selección en un grupo de radios. Se suman Inicio y Fin,
     y se saltan las opciones deshabilitadas. */

  doc.addEventListener("keydown", function (e) {
    if (e.key !== "Home" && e.key !== "End") return;
    var grupo = e.target.closest && e.target.closest(".sc-segmento, .sc-chips[role=radiogroup]");
    if (!grupo || e.target.type !== "radio") return;
    var radios = Array.prototype.filter.call(grupo.querySelectorAll('input[type="radio"]'), function (r) { return !r.disabled; });
    if (!radios.length) return;
    var r = e.key === "Home" ? radios[0] : radios[radios.length - 1];
    e.preventDefault();
    r.focus();
    if (!r.checked) { r.checked = true; r.dispatchEvent(new Event("change", { bubbles: true })); }
  });

  /* ── Tabla ordenable ──────────────────────────────────────────────
     <th scope="col"><button class="sc-tabla__orden">LST</button></th>. Una columna con
     class="sc-num" ordena como número. El valor de orden puede ir en data-orden de la celda. */

  function valorCelda(fila, i, numero) {
    var c = fila.children[i];
    if (!c) return numero ? -Infinity : "";
    var v = c.hasAttribute("data-orden") ? c.getAttribute("data-orden") : c.textContent.trim();
    if (!numero) return v;
    var n = parseFloat(v.replace(/−/g, "-").replace(/[^\d.eE+\-]/g, ""));
    return isNaN(n) ? -Infinity : n;
  }

  SC.ordenarTabla = function (tabla) {
    tabla = porId(tabla);
    if (!tabla || tabla.dataset.scOrden) return;
    tabla.dataset.scOrden = "1";
    tabla.addEventListener("click", function (e) {
      var b = e.target.closest(".sc-tabla__orden");
      if (!b) return;
      var th = b.closest("th"), fila = th.parentElement;
      var i = Array.prototype.indexOf.call(fila.children, th);
      var numero = th.classList.contains("sc-num");
      var sube = th.getAttribute("aria-sort") !== "ascending";
      Array.prototype.forEach.call(fila.children, function (h) { if (h !== th) h.removeAttribute("aria-sort"); });
      th.setAttribute("aria-sort", sube ? "ascending" : "descending");
      var cuerpo = tabla.tBodies[0];
      var filas = Array.prototype.slice.call(cuerpo.rows);
      filas.sort(function (a, b2) {
        var x = valorCelda(a, i, numero), y = valorCelda(b2, i, numero);
        var r = numero ? x - y : String(x).localeCompare(String(y), "es", { numeric: true });
        return sube ? r : -r;
      });
      filas.forEach(function (f) { cuerpo.appendChild(f); });
    });
  };

  /* ── <sc-barra> y <sc-pie> ───────────────────────────────────── */

  var VIAS = [
    { id: "via-a", texto: "Región", ruta: "via-a/" },
    { id: "via-b", texto: "Hermosillo", ruta: "via-b/" },
    { id: "metodo", texto: "Método", ruta: "metodo/" }
  ];

  function definir(nombre, clase) {
    if (raiz.customElements && !raiz.customElements.get(nombre)) raiz.customElements.define(nombre, clase);
  }

  if (raiz.customElements) {
    class Barra extends HTMLElement {
      connectedCallback() {
        if (this.dataset.scListo) return;
        this.dataset.scListo = "1";
        var base = this.getAttribute("raiz") || "/";
        var actual = this.getAttribute("actual");
        var destino = this.getAttribute("contenido") || "contenido";
        this.textContent = "";

        var saltar = crear("a", "sc-saltar", "Saltar al contenido");
        saltar.href = "#" + destino;

        var barra = crear("header", "sc-barra");
        var marca = crear("a", "sc-barra__marca");
        marca.href = base;
        marca.appendChild(crear("span", "sc-barra__sol")).setAttribute("aria-hidden", "true");
        marca.appendChild(doc.createTextNode("SunCity"));
        var nav = crear("nav"); nav.setAttribute("aria-label", "Secciones");
        var lista = crear("ul", "sc-barra__nav");
        VIAS.forEach(function (v) {
          var li = crear("li"), a = crear("a", null, v.texto);
          a.href = base + v.ruta;
          if (v.id === actual) a.setAttribute("aria-current", "page");
          li.appendChild(a); lista.appendChild(li);
        });
        nav.appendChild(lista);
        barra.appendChild(marca); barra.appendChild(nav);
        this.appendChild(saltar); this.appendChild(barra);
      }
    }
    definir("sc-barra", Barra);

    class Pie extends HTMLElement {
      connectedCallback() {
        if (this.dataset.scListo) return;
        this.dataset.scListo = "1";
        var base = this.getAttribute("raiz") || "/";
        this.textContent = "";

        var pie = crear("footer", "sc-pie");
        var fuentes = crear("p");
        fuentes.appendChild(doc.createTextNode("Datos: NASA POWER (MERRA-2), MODIS y ECOSTRESS. "));
        var metodo = crear("a", null, "Método, fuentes y límites"); metodo.href = base + "metodo/";
        fuentes.appendChild(metodo);
        fuentes.appendChild(doc.createTextNode("."));
        pie.appendChild(fuentes);

        var versiones = crear("p", "sc-pie__versiones");
        if (this.getAttribute("datos")) versiones.appendChild(crear("span", null, "Datos: " + this.getAttribute("datos")));
        if (this.getAttribute("software")) versiones.appendChild(crear("span", null, "Software: " + this.getAttribute("software")));
        if (versiones.childNodes.length) pie.appendChild(versiones);
        pie.appendChild(crear("p", null, "Proyecto SunCity, NASA Space Apps Challenge 2026, Hermosillo."));
        this.appendChild(pie);
      }
    }
    definir("sc-pie", Pie);
  }

  /* ── Arranque ─────────────────────────────────────────────────── */

  function iniciar() {
    Array.prototype.forEach.call(doc.querySelectorAll("table.sc-tabla[data-sc-ordenable]"), SC.ordenarTabla);
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})(window);
