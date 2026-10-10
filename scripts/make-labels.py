#!/usr/bin/env python3
"""Gera um PDF de etiquetas de identificacao a partir do CSV de inscricoes.

Uso: python3 scripts/make-labels.py <arquivo.csv> [--guias]

Grava "<arquivo> - etiquetas.pdf" ao lado do original (que nao e alterado).
Folha adesiva Carta com 20 etiquetas de 101,6 x 25,4 mm (2 x 10, modelo
Pimaco 6181 / Avery 5161), em ordem alfabetica de nome. Linhas sem nome sao
puladas e listadas no terminal.

Imprima em tamanho real (100%, sem "ajustar a pagina") e papel Carta.
--guias desenha o contorno de cada etiqueta, para testar o alinhamento em
papel comum antes de gastar a folha adesiva.

Requer reportlab (pip install reportlab).
"""
import csv
import pathlib
import re
import sys
import unicodedata

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import mm
from reportlab.lib.utils import simpleSplit
from reportlab.pdfgen import canvas

# Campo da etiqueta -> cabecalho no CSV (comparado sem espacos nas pontas e
# sem diferenciar maiusculas).
COLUMNS = {
    "name": "nome completo",
    "birth_date": "data de nascimento",
    "belt": "faixa",
    "gender": "sexo",
    "weight": "peso",
    "team": "equipe",
}

# Medidas da folha adesiva; para outro modelo, edite so este bloco.
PAGE_WIDTH, PAGE_HEIGHT = letter
LABEL_COLUMNS = 2
LABEL_ROWS = 10
LABEL_WIDTH = 101.6 * mm
LABEL_HEIGHT = 25.4 * mm
PAGE_TOP_MARGIN = 12.7 * mm
PAGE_LEFT_MARGIN = 4.0 * mm
COLUMN_GAP = PAGE_WIDTH - 2 * PAGE_LEFT_MARGIN - LABEL_COLUMNS * LABEL_WIDTH
LABEL_PADDING = 4 * mm
TEXT_WIDTH = LABEL_WIDTH - 2 * LABEL_PADDING

NAME_FONT = "Helvetica-Bold"
TEXT_FONT = "Helvetica"
NAME_MAX_SIZE = 14
NAME_MIN_SIZE = 8
TEXT_SIZE = 9
# Distancia do topo da etiqueta ate a base de cada linha de texto.
NAME_BASELINE = 8.5 * mm
TEAM_BASELINE = 14.5 * mm
DETAIL_BASELINE = 20 * mm

# Ha inscricoes com o CPF digitado junto do nome; ele nao pode ir na etiqueta.
CPF_PATTERN = re.compile(r"\d{3}\.?\d{3}\.?\d{3}-?\d{2}")


def clean(value):
    return " ".join((value or "").split())


def strip_accents(text):
    """Para ordenar: sem isso "ÉRICA" iria para depois do "Z"."""
    return "".join(
        char
        for char in unicodedata.normalize("NFD", text)
        if unicodedata.category(char) != "Mn"
    )


def read_athletes(source):
    """Devolve (atletas, numeros das linhas puladas)."""
    with source.open(encoding="utf-8-sig", newline="") as file:
        rows = list(csv.reader(file))
    if not rows:
        sys.exit(f"{source}: arquivo vazio")

    headers = [header.strip().lower() for header in rows[0]]
    missing = [header for header in COLUMNS.values() if header not in headers]
    if missing:
        sys.exit(f"{source}: colunas nao encontradas: {missing}")
    index_by_field = {
        field: headers.index(header) for field, header in COLUMNS.items()
    }

    athletes = []
    skipped_lines = []
    for line_number, row in enumerate(rows[1:], start=2):
        athlete = {
            field: clean(row[index]) if index < len(row) else ""
            for field, index in index_by_field.items()
        }
        athlete["name"] = clean(CPF_PATTERN.sub("", athlete["name"])).upper()
        if not athlete["name"]:
            skipped_lines.append(line_number)
            continue
        athletes.append(athlete)

    athletes.sort(key=lambda athlete: strip_accents(athlete["name"]))
    return athletes, skipped_lines


def fit_text(text, font, max_size, min_size):
    """Devolve (tamanho da fonte, texto) para caber em uma linha da etiqueta."""
    for size in range(max_size, min_size - 1, -1):
        lines = simpleSplit(text, font, size, TEXT_WIDTH)
        if len(lines) <= 1:
            break
    return size, lines[0] if lines else ""


def format_weight(weight):
    return f"{weight.replace('.', ',')} kg" if weight else "-"


def draw_label(pdf, athlete, left, top):
    text_left = left + LABEL_PADDING
    text_center = left + LABEL_WIDTH / 2
    text_right = left + LABEL_WIDTH - LABEL_PADDING

    name_size, name = fit_text(
        athlete["name"], NAME_FONT, NAME_MAX_SIZE, NAME_MIN_SIZE
    )
    pdf.setFont(NAME_FONT, name_size)
    pdf.drawString(text_left, top - NAME_BASELINE, name)

    pdf.setFont(TEXT_FONT, TEXT_SIZE)
    birth_date = f"Nasc.: {athlete['birth_date'] or '-'}"
    pdf.drawRightString(text_right, top - TEAM_BASELINE, birth_date)
    team_width = TEXT_WIDTH - pdf.stringWidth(birth_date) - LABEL_PADDING
    team_lines = simpleSplit(athlete["team"] or "-", TEXT_FONT, TEXT_SIZE, team_width)
    pdf.drawString(text_left, top - TEAM_BASELINE, team_lines[0])

    detail_y = top - DETAIL_BASELINE
    pdf.drawString(text_left, detail_y, f"Faixa: {athlete['belt'].title() or '-'}")
    pdf.drawCentredString(text_center, detail_y, f"Sexo: {athlete['gender'] or '-'}")
    pdf.drawRightString(
        text_right, detail_y, f"Peso: {format_weight(athlete['weight'])}"
    )


def draw_guides(pdf):
    pdf.saveState()
    pdf.setDash(2, 3)
    pdf.setLineWidth(0.3)
    for slot in range(LABEL_COLUMNS * LABEL_ROWS):
        left, top = label_origin(slot)
        pdf.rect(left, top - LABEL_HEIGHT, LABEL_WIDTH, LABEL_HEIGHT)
    pdf.restoreState()


def label_origin(slot):
    """Devolve (esquerda, topo) da etiqueta na posicao slot da folha."""
    column = slot % LABEL_COLUMNS
    row = slot // LABEL_COLUMNS
    left = PAGE_LEFT_MARGIN + column * (LABEL_WIDTH + COLUMN_GAP)
    top = PAGE_HEIGHT - PAGE_TOP_MARGIN - row * LABEL_HEIGHT
    return left, top


def write_pdf(athletes, target, with_guides):
    labels_per_page = LABEL_COLUMNS * LABEL_ROWS
    pdf = canvas.Canvas(str(target), pagesize=letter)
    pdf.setTitle(target.stem)

    for position, athlete in enumerate(athletes):
        slot = position % labels_per_page
        if slot == 0:
            if position:
                pdf.showPage()
            if with_guides:
                draw_guides(pdf)
        left, top = label_origin(slot)
        draw_label(pdf, athlete, left, top)

    pdf.save()
    return -(-len(athletes) // labels_per_page)


def main():
    arguments = [argument for argument in sys.argv[1:] if argument != "--guias"]
    with_guides = "--guias" in sys.argv[1:]
    if not arguments:
        sys.exit(__doc__)

    source = pathlib.Path(arguments[0])
    if not source.is_file():
        sys.exit(f"{source}: arquivo nao encontrado")

    athletes, skipped_lines = read_athletes(source)
    if not athletes:
        sys.exit(f"{source}: nenhum atleta com nome para gerar etiqueta")

    target = source.with_name(f"{source.stem} - etiquetas.pdf")
    pages = write_pdf(athletes, target, with_guides)

    print(f"{len(athletes)} etiquetas em {pages} folhas: {target}")
    if skipped_lines:
        print(f"Linhas puladas (sem nome): {skipped_lines}")


if __name__ == "__main__":
    main()
