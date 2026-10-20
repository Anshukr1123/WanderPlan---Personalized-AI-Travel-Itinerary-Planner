"""Application configuration module.
Reads environment variables with validation and provides structured access.
"""
from __future__ import annotations
import os
from typing import List
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

class Settings:
    """Application settings with environment variable parsing."""

    def __init__(self) -> None:
        self.PORT: int = int(os.getenv("PORT", "8000"))
        self.ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
        self.FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
        
        # Allowed CORS origins
        allowed_origins_raw = os.getenv("ALLOWED_ORIGINS", "")
        if allowed_origins_raw:
            self.ALLOWED_ORIGINS: List[str] = [origin.strip() for origin in allowed_origins_raw.split(",") if origin.strip()]
        else:
            self.ALLOWED_ORIGINS = [
                "http://localhost:3000",
                "http://localhost:5173",
                "http://127.0.0.1:3000",
                "http://127.0.0.1:5173",
                self.FRONTEND_URL
            ]

        # API Base URL (Frontend -> Backend connection)
        self.VITE_API_BASE_URL: str = os.getenv("VITE_API_BASE_URL", "")

        # Groq AI Settings
        self.GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
        self.GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        self.GROQ_TIMEOUT_SECONDS: float = float(os.getenv("GROQ_TIMEOUT_SECONDS", "45.0"))
        self.GROQ_MAX_RETRIES: int = int(os.getenv("GROQ_MAX_RETRIES", "3"))

        # Unsplash API Settings
        self.UNSPLASH_ACCESS_KEY: str = os.getenv("UNSPLASH_ACCESS_KEY", "")
        self.UNSPLASH_APP_NAME: str = os.getenv("UNSPLASH_APP_NAME", "WanderPlan")
        self.UNSPLASH_TIMEOUT_SECONDS: float = float(os.getenv("UNSPLASH_TIMEOUT_SECONDS", "10.0"))

        # Supabase Settings (support both SUPABASE_* and VITE_SUPABASE_* keys)
        self.SUPABASE_URL: str = (os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL") or "").rstrip("/")
        self.SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY") or ""
        self.SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    @property
    def is_groq_configured(self) -> bool:
        return bool(self.GROQ_API_KEY and len(self.GROQ_API_KEY.strip()) > 5)

    @property
    def is_unsplash_configured(self) -> bool:
        return bool(self.UNSPLASH_ACCESS_KEY and len(self.UNSPLASH_ACCESS_KEY.strip()) > 5)

    @property
    def is_supabase_configured(self) -> bool:
        return bool(self.SUPABASE_URL and self.SUPABASE_ANON_KEY)


settings = Settings()
