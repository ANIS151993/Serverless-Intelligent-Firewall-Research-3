#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PASSWORD="${1:-MARC@151995$}"
PAPER_DIR="$ROOT_DIR/artifacts/paper"
LATEX_DIR="$ROOT_DIR/artifacts/latex"
PUBLISH_DIR="$ROOT_DIR/docs/assets/papers"

mkdir -p "$PAPER_DIR" "$LATEX_DIR" "$PUBLISH_DIR"

cp -f "ASLF-OSINT (Journal).doc" "$PAPER_DIR/ASLF-OSINT-Research-Paper.doc"

python3 scripts/generate_preview_pdf.py
cp -f "$PAPER_DIR/ASLF-OSINT-Research-First-Page-Preview.pdf" "$PAPER_DIR/ASLF-OSINT-Research-Paper.pdf"

rm -f "$PUBLISH_DIR/ASLF-OSINT-Research-Paper-Encrypted.zip"
rm -f "$PUBLISH_DIR/ASLF-OSINT-LaTeX-Source-Encrypted.zip"
rm -f "$PUBLISH_DIR/ASLF-OSINT-Doc-PDF-LaTeX-Encrypted.zip"

(
  cd "$PAPER_DIR"
  zip -q -P "$PASSWORD" "$PUBLISH_DIR/ASLF-OSINT-Research-Paper-Encrypted.zip" \
    ASLF-OSINT-Research-Paper.doc \
    ASLF-OSINT-Research-Paper.pdf \
    ASLF-OSINT-Research-First-Page-Preview.pdf
)

(
  cd "$LATEX_DIR"
  zip -q -P "$PASSWORD" "$PUBLISH_DIR/ASLF-OSINT-LaTeX-Source-Encrypted.zip" \
    main.tex \
    references.bib
)

(
  cd "$ROOT_DIR/artifacts"
  zip -q -P "$PASSWORD" "$PUBLISH_DIR/ASLF-OSINT-Doc-PDF-LaTeX-Encrypted.zip" \
    paper/ASLF-OSINT-Research-Paper.doc \
    paper/ASLF-OSINT-Research-Paper.pdf \
    paper/ASLF-OSINT-Research-First-Page-Preview.pdf \
    latex/main.tex \
    latex/references.bib
)

echo "Encrypted artifacts created in $PUBLISH_DIR"
