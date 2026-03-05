#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path


def pdf_escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def build_content(lines: list[str]) -> str:
    parts = ["BT", "/F1 12 Tf", "70 770 Td", "14 TL"]
    for idx, line in enumerate(lines):
        safe = pdf_escape(line)
        if idx == 0:
            parts.append("/F1 16 Tf")
            parts.append(f"({safe}) Tj")
            parts.append("/F1 12 Tf")
        else:
            parts.append("T*")
            parts.append(f"({safe}) Tj")
    parts.append("ET")
    return "\n".join(parts)


def write_simple_pdf(path: Path, lines: list[str]) -> None:
    content = build_content(lines).encode("latin-1", errors="replace")

    objects: list[bytes] = []
    objects.append(b"<< /Type /Catalog /Pages 2 0 R >>")
    objects.append(b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>")
    objects.append(b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>")
    objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    objects.append(f"<< /Length {len(content)} >>\nstream\n".encode("latin-1") + content + b"\nendstream")

    header = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"
    body = bytearray(header)
    offsets = [0]

    for idx, obj in enumerate(objects, start=1):
        offsets.append(len(body))
        body.extend(f"{idx} 0 obj\n".encode("latin-1"))
        body.extend(obj)
        body.extend(b"\nendobj\n")

    xref_offset = len(body)
    body.extend(f"xref\n0 {len(objects) + 1}\n".encode("latin-1"))
    body.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        body.extend(f"{offset:010d} 00000 n \n".encode("latin-1"))

    body.extend(
        (
            "trailer\n"
            f"<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
            "startxref\n"
            f"{xref_offset}\n"
            "%%EOF\n"
        ).encode("latin-1")
    )

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(bytes(body))


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    preview_path = root / "artifacts" / "paper" / "ASLF-OSINT-Research-First-Page-Preview.pdf"

    lines = [
        "Autonomous Self-Learning Serverless Intelligent Firewall",
        "Integrating REST API-Driven Open-Source Threat Intelligence,",
        "Multi-Paradigm Machine Learning, and Federated Zero-Trust Architectures",
        "",
        "Md Anisur Rahman Chowdhury",
        "",
        "Abstract:",
        "This first-page preview summarizes the Research-3 manuscript and",
        "demonstrates the architecture that combines threat-intel APIs,",
        "adaptive scoring, and federated zero-trust policy enforcement.",
        "Full manuscript and source files are distributed as encrypted archives.",
        "",
        "Access Policy:",
        "1. Follow GitHub: github.com/ANIS151993",
        "2. Subscribe to YouTube: https://youtu.be/O_pLEz7cyaY",
        "3. Send password request to engr.aanis@gmail.com",
        "",
        "Preview generated for GitHub Pages publication.",
    ]

    write_simple_pdf(preview_path, lines)

    public_path = root / "docs" / "assets" / "papers" / preview_path.name
    public_path.write_bytes(preview_path.read_bytes())
    print(f"Generated {preview_path}")
    print(f"Copied to {public_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
