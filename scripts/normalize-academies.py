#!/usr/bin/env python3
"""Normaliza a coluna de equipe/academia de um CSV de inscricoes.

Uso: python3 scripts/normalize-academies.py <arquivo.csv> [coluna]

Grava "<arquivo> - normalizado.csv" ao lado do original (que nao e alterado)
e imprime o de-para aplicado, para conferencia.
"""
import collections
import csv
import pathlib
import re
import sys
import unicodedata

# Regras avaliadas em ordem; a primeira cujo padrao aparecer na chave
# (minusculas, sem acento, sem pontuacao) define o nome oficial.
# Para separar ou juntar equipes, edite so esta tabela.
RULES = [
    (r"thai hunter|quati", "Thai Hunter/Quati Jiu-Jitsu"),
    (r"iretama", "PSC Iretama"),
    (r"semea|araucaria|lar ?parana|moras", "Semeando Campeões"),
    (r"barbo[sz]a ferraz|arno|fau?st|projeto|porjeto", "Faustão BJJ"),
]


def build_key(name):
    without_accents = "".join(
        char
        for char in unicodedata.normalize("NFD", name)
        if unicodedata.category(char) != "Mn"
    )
    return re.sub(r"[^a-z0-9]+", " ", without_accents.lower()).strip()


def normalize(name):
    """Devolve (nome oficial, True se alguma regra casou)."""
    key = build_key(name)
    for pattern, official_name in RULES:
        if re.search(pattern, key):
            return official_name, True
    return " ".join(name.split()), False


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)

    source = pathlib.Path(sys.argv[1])
    column = sys.argv[2] if len(sys.argv) > 2 else "Equipe"

    with source.open(encoding="utf-8-sig", newline="") as file:
        rows = list(csv.reader(file))
    if not rows:
        sys.exit(f"{source}: arquivo vazio")

    headers = [header.strip() for header in rows[0]]
    if column not in headers:
        sys.exit(f"{source}: coluna '{column}' nao encontrada em {headers}")
    index = headers.index(column)

    mapping = collections.Counter()
    unmatched = collections.Counter()
    for line_number, row in enumerate(rows[1:], start=2):
        if len(row) <= index:
            print(f"linha {line_number}: sem coluna '{column}', mantida como esta")
            continue
        original = row[index]
        row[index], matched = normalize(original)
        mapping[(row[index], original)] += 1
        if not matched:
            unmatched[row[index]] += 1

    target = source.with_name(f"{source.stem} - normalizado.csv")
    with target.open("w", encoding="utf-8", newline="") as file:
        csv.writer(file).writerows(rows)

    totals = collections.Counter()
    for (official_name, _), count in mapping.items():
        totals[official_name] += count
    for official_name, total in sorted(totals.items(), key=lambda item: -item[1]):
        print(f"\n{official_name} ({total})")
        for (name, original), count in sorted(mapping.items()):
            if name == official_name and original != official_name:
                print(f"    <- {original!r} ({count})")

    if unmatched:
        print("\nSEM REGRA (mantidos, revisar a mao):")
        for name, count in sorted(unmatched.items()):
            print(f"    {name!r} ({count})")
    print(f"\nGravado: {target}")


if __name__ == "__main__":
    main()
