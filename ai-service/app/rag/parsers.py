import os
import io
from typing import Tuple, List, Dict
import pypdf
import docx

def parse_markdown(content: str) -> List[Dict[str, str]]:
    """
    Parses Markdown text and segments it by headings (#, ##, ###).
    Returns list of dicts with 'section' and 'text'.
    """
    sections = []
    lines = content.splitlines()
    current_section = "Overview"
    current_text = []

    for line in lines:
        stripped = line.strip()
        if stripped.startswith("#"):
            if current_text:
                sections.append({
                    "section": current_section,
                    "text": "\n".join(current_text).strip()
                })
                current_text = []
            current_section = stripped.lstrip("#").strip()
        else:
            current_text.append(line)

    if current_text:
        sections.append({
            "section": current_section,
            "text": "\n".join(current_text).strip()
        })

    return sections

def parse_pdf(pdf_bytes_or_stream) -> str:
    """Extracts raw text from a PDF byte stream using pypdf."""
    reader = pypdf.PdfReader(pdf_bytes_or_stream)
    full_text = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            full_text.append(text)
    return "\n\n".join(full_text)

def parse_docx(docx_bytes_or_stream) -> str:
    """Extracts text paragraphs from a DOCX byte stream using python-docx."""
    doc = docx.Document(docx_bytes_or_stream)
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n\n".join(paragraphs)

def extract_document_text(file_type: str, content_bytes: bytes) -> str:
    """Dispatches parsing based on file extension / type."""
    t = file_type.lower().strip(".")
    stream = io.BytesIO(content_bytes)

    if t in ("pdf", "application/pdf"):
        return parse_pdf(stream)
    elif t in ("docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"):
        return parse_docx(stream)
    elif t in ("md", "markdown", "txt", "text/plain"):
        return content_bytes.decode("utf-8", errors="replace")
    else:
        # Fallback raw decode
        return content_bytes.decode("utf-8", errors="replace")
