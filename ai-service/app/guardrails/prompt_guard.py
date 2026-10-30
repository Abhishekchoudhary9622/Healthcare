"""
Prompt Injection and Jailbreak Guardrail
Detects adversarial inputs, prompt injection, and unauthorized role-play escapes.
"""
import re
from typing import Tuple, List

INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior)\s+(instructions|prompts|rules)",
    r"disregard\s+(all\s+)?(previous|prior)\s+(instructions|directives)",
    r"you\s+are\s+now\s+(unrestricted|in\s+developer\s+mode|dan|godmode)",
    r"bypass\s+(all\s+)?(safety|clinical|security)\s+(filters|rules|guidelines)",
    r"system\s*prompt\s*:\s*",
    r"<\s*\|?im_start\|?\s*>",
    r"<\s*\|?system\|?\s*>",
    r"reveal\s+your\s+(internal|hidden|system)\s+(instructions|prompt)",
    r"act\s+as\s+a\s+licensed\s+physician\s+giving\s+official\s+diagnosis",
    r"prescribe\s+me\s+controlled\s+substances\s+without\s+doctor",
    r"sudo\s+override",
    r"eval\s*\(",
    r"__import__\s*\("
]

def check_prompt_injection(prompt: str) -> Tuple[bool, str]:
    """
    Evaluates whether the prompt contains adversarial injection patterns.
    Returns:
        (is_flagged, reason)
    """
    if not prompt:
        return False, "Empty query"

    prompt_clean = prompt.lower()

    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, prompt_clean):
            return True, f"Security violation: Input triggered safety heuristic pattern matching '{pattern}'."

    # Repetition / Delimiter overload check
    if prompt.count("---") > 6 or prompt.count("###") > 10:
        return True, "Security violation: Excessive delimiter framing detected."

    return False, "Input passed prompt integrity verification."
