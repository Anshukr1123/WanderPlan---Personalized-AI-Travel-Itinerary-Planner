"""Pydantic compatibility layer with lightweight fallback for bare environments."""
from __future__ import annotations
import sys
from typing import Any, Dict

try:
    from pydantic import BaseModel, Field
    HAS_PYDANTIC = True
except ImportError:
    HAS_PYDANTIC = False
    
    class BaseModel:
        """Lightweight fallback when Pydantic is not yet installed."""
        def __init__(self, **kwargs: Any) -> None:
            for k, v in kwargs.items():
                setattr(self, k, v)

        def model_dump(self) -> Dict[str, Any]:
            return self.__dict__.copy()

        def dict(self) -> Dict[str, Any]:
            return self.model_dump()

        @classmethod
        def parse_obj(cls, obj: Any):
            if isinstance(obj, dict):
                return cls(**obj)
            return obj

    def Field(default: Any = ..., **kwargs: Any) -> Any:
        return default
