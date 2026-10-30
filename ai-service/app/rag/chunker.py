"""
Medical Document Chunker
Preserves markdown section hierarchies, clinical headings, and uses a sliding window
with overlap to prevent loss of clinical context across boundaries.
"""
import re
from typing import List, Dict, Any, Optional
from app.rag.parsers import parse_markdown

def split_text_with_overlap(
    text: str, 
    chunk_size: int = 600, 
    chunk_overlap: int = 120,
    target_chunk_size: Optional[int] = None,
    overlap: Optional[int] = None
) -> List[str]:
    """
    Sliding window chunking with sentence/paragraph boundary preservation.
    """
    if target_chunk_size:
        chunk_size = target_chunk_size
    if overlap:
        chunk_overlap = overlap

    if len(text) <= chunk_size:
        return [text] if text.strip() else []

    paragraphs = re.split(r'\n{2,}|\.\s+', text)
    chunks = []
    current_chunk = []
    current_len = 0

    for para in paragraphs:
        para_clean = para.strip()
        if not para_clean:
            continue
        p_len = len(para_clean)

        if current_len + p_len > chunk_size and current_chunk:
            combined = ". ".join(current_chunk)
            chunks.append(combined)
            
            # Retain overlap from end of current chunk
            overlap_items = []
            overlap_len = 0
            for item in reversed(current_chunk):
                if overlap_len + len(item) <= chunk_overlap:
                    overlap_items.insert(0, item)
                    overlap_len += len(item)
                else:
                    break
            current_chunk = overlap_items
            current_len = overlap_len

        current_chunk.append(para_clean)
        current_len += p_len

    if current_chunk:
        chunks.append(". ".join(current_chunk))

    return chunks

def chunk_medical_document(
    doc_id: str,
    title: str,
    raw_content: str,
    chunk_size: int = 600,
    chunk_overlap: int = 120,
    target_chunk_size: Optional[int] = None,
    overlap: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Chunks a medical document while retaining section hierarchy (e.g. Indications,
    Contraindications, Dosage, Red Flags).
    """
    if target_chunk_size:
        chunk_size = target_chunk_size
    if overlap:
        chunk_overlap = overlap

    sections = parse_markdown(raw_content)
    result_chunks = []
    chunk_idx = 0

    for sec in sections:
        sec_name = sec["section"]
        sec_text = sec["text"]
        text_slices = split_text_with_overlap(sec_text, chunk_size, chunk_overlap)

        for s in text_slices:
            if not s.strip():
                continue
            chunk_idx += 1
            cid = f"{doc_id}#c{chunk_idx}"
            result_chunks.append({
                "chunk_id": cid,
                "doc_id": doc_id,
                "title": title,
                "section": sec_name,
                "content": f"[{title} - {sec_name}]\n{s.strip()}"
            })

    # If no markdown headings found, treat whole text as General section
    if not result_chunks and raw_content.strip():
        slices = split_text_with_overlap(raw_content, chunk_size, chunk_overlap)
        for idx, s in enumerate(slices, start=1):
            result_chunks.append({
                "chunk_id": f"{doc_id}#c{idx}",
                "doc_id": doc_id,
                "title": title,
                "section": "General",
                "content": s.strip()
            })

    return result_chunks
