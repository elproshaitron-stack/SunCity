"""Construye docs/SunCity-Documentacion.pdf a partir de los .md.

Requiere: pandoc, mermaid-cli (mmdc) y Chrome o Chromium.
Uso:  python docs/construir_pdf.py
"""
import json, pathlib, re, shutil, subprocess, sys, tempfile

RAIZ = pathlib.Path(__file__).resolve().parent.parent
DOCS = RAIZ / "docs"
ORDEN = [RAIZ / "README.md", DOCS / "01-PLAN.md", DOCS / "02-FASES.md",
         DOCS / "03-ARQUITECTURA.md", DOCS / "04-DATOS-Y-APIS.md",
         DOCS / "05-MODELOS.md", DOCS / "DECISIONES.md"]
SALIDA = DOCS / "SunCity-Documentacion.pdf"

CSS = """
@page { size: Letter; margin: 18mm 16mm 18mm 16mm; }
body { font-family: "Helvetica Neue", Arial, "DejaVu Sans", sans-serif; font-size: 10.5pt;
       line-height: 1.45; color: #1c2430; max-width: none; margin: 0; padding: 0; }
h1 { font-size: 21pt; color: #9a3412; border-bottom: 2px solid #f97316; padding-bottom: 4px;
     page-break-before: always; margin-top: 0; }
h1.primera { page-break-before: avoid; }
h2 { font-size: 14pt; color: #1e3a5f; margin-top: 18px; page-break-after: avoid; }
h3 { font-size: 11.5pt; color: #1e3a5f; page-break-after: avoid; }
table { border-collapse: collapse; width: 100%; margin: 8px 0 12px; font-size: 9pt; }
th { background: #1e3a5f; color: #fff; text-align: left; padding: 5px 6px; }
td { border: 1px solid #cbd5e1; padding: 4px 6px; vertical-align: top; }
tr { page-break-inside: avoid; }
tr:nth-child(even) td { background: #f8fafc; }
code { font-family: "DejaVu Sans Mono", Menlo, monospace; font-size: 8.6pt; background: #f1f5f9;
       padding: 1px 3px; border-radius: 3px; overflow-wrap: anywhere; }
pre { background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 8px;
      white-space: pre-wrap; overflow-wrap: anywhere; page-break-inside: avoid; }
pre code { background: none; padding: 0; font-size: 8.2pt; }
blockquote { border-left: 4px solid #f97316; margin: 10px 0; padding: 4px 12px; background: #fff7ed; }
img { max-width: 100%; max-height: 215mm; display: block; margin: 10px auto; page-break-inside: avoid; }
a { color: #1e3a5f; text-decoration: none; }
ul.task-list { list-style: none; padding-left: 4px; }
.portada { text-align: center; padding-top: 70mm; page-break-after: always; }
.portada .t { font-size: 34pt; color: #9a3412; font-weight: 700; }
.portada .s { font-size: 15pt; color: #1e3a5f; margin-top: 8px; }
.portada .m { font-size: 10.5pt; color: #475569; margin-top: 28px; }
"""


def chrome():
    for n in ("google-chrome", "chromium", "chromium-browser", "chrome"):
        if shutil.which(n):
            return shutil.which(n)
    sys.exit("No se encontró Chrome o Chromium")


def main():
    tmp = pathlib.Path(tempfile.mkdtemp())
    (tmp / "pp.json").write_text(json.dumps(
        {"executablePath": chrome(), "args": ["--no-sandbox"]}))
    (tmp / "mm.json").write_text(json.dumps(
        {"theme": "neutral", "themeVariables": {"fontFamily": "Arial, sans-serif"}}))
    n = [0]

    def render(m):
        n[0] += 1
        src, png = tmp / f"d{n[0]}.mmd", tmp / f"d{n[0]}.png"
        src.write_text(m.group(1))
        subprocess.run(["mmdc", "-i", str(src), "-o", str(png), "-p", str(tmp / "pp.json"),
                        "-c", str(tmp / "mm.json"), "-b", "white", "-s", "3", "-w", "760", "-q"],
                       check=True)
        return f"![]({png})"

    partes = []
    for i, f in enumerate(ORDEN):
        t = f.read_text(encoding="utf-8")
        t = re.sub(r"```mermaid\n(.*?)```", render, t, flags=re.S)
        t = re.sub(r"\]\((?!https?:|/)[^)#]*\.(md|pdf|py)(#[^)]*)?\)", "](#)", t)  # enlaces internos
        if i == 0:
            t = t.replace("# SunCity · Sonora Calor", "# Resumen {.primera}", 1)
        partes.append(t)
    (tmp / "todo.md").write_text("\n\n".join(partes), encoding="utf-8")
    (tmp / "e.css").write_text(CSS)
    (tmp / "portada.html").write_text(
        '<div class="portada"><div class="t">SunCity · Sonora Calor</div>'
        '<div class="s">Plan, fases, arquitectura, datos y modelos</div>'
        '<div class="m">NASA Space Apps Challenge 2026 · Hermosillo<br>'
        'Documentación del repositorio · basada en el Plan v5 del 14 de noviembre de 2026</div></div>')
    html = tmp / "todo.html"
    subprocess.run(["pandoc", str(tmp / "todo.md"), "-f", "gfm+tex_math_dollars+attributes",
                    "-t", "html5", "-s", "--mathml", "--embed-resources", "--css", str(tmp / "e.css"),
                    "--metadata", "title=SunCity · Sonora Calor", "--metadata", "lang=es",
                    "-B", str(tmp / "portada.html"),
                    "-V", "title-block-style=display:none", "-o", str(html)], check=True)
    h = html.read_text(encoding="utf-8")
    h = re.sub(r'<header id="title-block-header">.*?</header>', "", h, flags=re.S)
    h = re.sub(r'<input type="checkbox"[^>]*checked[^>]*/?>', "☑ ", h)
    h = re.sub(r'<input type="checkbox"[^>]*/?>', "☐ ", h)
    html.write_text(h, encoding="utf-8")
    subprocess.run([chrome(), "--headless=new", "--no-sandbox", "--disable-gpu",
                    "--no-pdf-header-footer", f"--print-to-pdf={SALIDA}", html.as_uri()],
                   check=True, capture_output=True)
    print("Listo:", SALIDA, f"({n[0]} diagramas)")


if __name__ == "__main__":
    main()
