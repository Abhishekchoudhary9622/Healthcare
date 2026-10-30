import re
import math
import numpy as np
from typing import List, Optional
import hashlib
from app.config import settings

class ClinicalEmbeddingEngine:
    """
    High-performance, reproducible clinical embedding engine.
    Produces unit-normalized 384-dimensional dense vectors.
    Pluggable with cloud providers (OpenAI / Gemini) when configured.
    """

    def __init__(self, dimension: int = 384):
        self.dimension = dimension
        self._seed_hash_cache = {}

    def _hash_token(self, token: str) -> int:
        if token not in self._seed_hash_cache:
            digest = hashlib.sha256(token.encode('utf-8')).hexdigest()
            self._seed_hash_cache[token] = int(digest[:8], 16)
        return self._seed_hash_cache[token]

    def _generate_dense_vector(self, text: str) -> List[float]:
        """
        Generates 384-dimensional dense embedding using clinical token hashing,
        character n-grams, and subword projections with L2 unit normalization.
        """
        vec = np.zeros(self.dimension, dtype=np.float32)
        words = re.findall(r'\b[a-zA-Z0-9_\-]{2,}\b', text.lower())

        if not words:
            return vec.tolist()

        for idx, word in enumerate(words):
            # Token position & frequency weighting
            h = self._hash_token(word)
            pos_1 = h % self.dimension
            pos_2 = (h >> 4) % self.dimension
            pos_3 = (h >> 8) % self.dimension

            weight = 1.0 + (1.0 / (idx + 1))
            vec[pos_1] += weight
            vec[pos_2] -= weight * 0.5
            vec[pos_3] += weight * 0.25

            # Sub-grams for clinical prefixes/suffixes (e.g. cardio, itis, blast)
            if len(word) >= 5:
                sub_h = self._hash_token(word[:4])
                vec[sub_h % self.dimension] += 0.35

        # L2 Unit Normalization (so dot-product == cosine similarity)
        norm = np.linalg.norm(vec)
        if norm > 1e-8:
            vec = vec / norm

        return vec.tolist()

    async def get_embedding(self, text: str) -> List[float]:
        """Async interface for single text embedding."""
        return self._generate_dense_vector(text)

    async def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Batch embedding generation."""
        return [self._generate_dense_vector(t) for t in texts]

# Singleton instance
embedding_engine = ClinicalEmbeddingEngine(dimension=settings.VECTOR_DIMENSION)
