import os
import yaml
from typing import List, Dict, Any, Optional
from app.schemas.okf import OKFDocument, OKFValidationResult
from app.okf.validator import validate_okf_document

def load_okf_file(file_path: str) -> Optional[OKFDocument]:
    """
    Loads and validates a single YAML or Markdown OKF document.
    """
    if not os.path.exists(file_path):
        return None

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)

        if not isinstance(data, dict):
            return None

        val = validate_okf_document(data)
        if not val.valid:
            return None

        # Convert to OKFDocument
        return OKFDocument.model_validate(data)
    except Exception:
        return None

def load_all_okf_documents(repo_dir: str) -> List[OKFDocument]:
    """
    Recursively scans repository directory for YAML OKF knowledge documents.
    """
    documents = []
    if not os.path.exists(repo_dir):
        return documents

    for root, _, files in os.walk(repo_dir):
        for file in files:
            if file.endswith((".yaml", ".yml")):
                full_path = os.path.join(root, file)
                doc = load_okf_file(full_path)
                if doc:
                    documents.append(doc)

    return documents
