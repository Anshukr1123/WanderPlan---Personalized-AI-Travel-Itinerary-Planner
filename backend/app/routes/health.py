"""Health, readiness, and service connection inspection routes."""
from __future__ import annotations
import asyncio
from typing import Dict, Any
from fastapi import APIRouter, Response, status

from app.config import settings
from app.services.groq_service import groq_service
from app.services.unsplash_service import unsplash_service
from app.services.supabase_service import supabase_service
from app.schemas.common import HealthStatusResponse, ServiceStatus

router = APIRouter(tags=["Health & Status"])

@router.get("/health", summary="Basic liveness probe")
async def health_check() -> Dict[str, str]:
    return {"status": "ok", "app": "WanderPlan API", "version": "1.0.0"}

@router.get("/ready", summary="Readiness probe")
async def readiness_check() -> Dict[str, str]:
    return {"status": "ready"}

@router.get("/api/services/status", summary="Detailed third-party service connectivity status")
async def get_services_status() -> Dict[str, Any]:
    """Test and report live status for Groq AI, Unsplash Images, and Supabase."""
    groq_task = groq_service.check_availability()
    unsplash_task = unsplash_service.check_availability()
    supabase_task = supabase_service.check_availability()

    groq_res, unsplash_res, supabase_res = await asyncio.gather(
        groq_task, unsplash_task, supabase_task, return_exceptions=True
    )

    def format_result(name: str, res: Any, configured: bool) -> Dict[str, Any]:
        if isinstance(res, Exception):
            return {
                "name": name,
                "configured": configured,
                "status": "error",
                "message": f"Service check threw exception: {str(res)}",
            }
        status_str = "connected" if res.get("available") else ("not_configured" if not res.get("configured") else "error")
        return {
            "name": name,
            "configured": res.get("configured", configured),
            "status": status_str,
            "message": res.get("message", "OK"),
            "details": {k: v for k, v in res.items() if k not in ("name", "message")},
        }

    services = {
        "groq": format_result("Groq AI", groq_res, settings.is_groq_configured),
        "unsplash": format_result("Unsplash Images", unsplash_res, settings.is_unsplash_configured),
        "supabase": format_result("Supabase Auth & Database", supabase_res, settings.is_supabase_configured),
    }

    variables = {
        "VITE_API_BASE_URL": {
            "configured": bool(settings.VITE_API_BASE_URL),
            "target": "Frontend Vercel deployment -> Render backend",
            "scope": "Frontend (Public)",
        },
        "VITE_SUPABASE_URL": {
            "configured": bool(settings.SUPABASE_URL),
            "target": "Supabase project database & auth endpoint",
            "scope": "Frontend & Backend",
        },
        "VITE_SUPABASE_ANON_KEY": {
            "configured": bool(settings.SUPABASE_ANON_KEY),
            "target": "Supabase client anonymous public key",
            "scope": "Frontend & Backend",
        },
        "GROQ_API_KEY": {
            "configured": bool(settings.is_groq_configured),
            "target": "Groq AI inference authorization key",
            "scope": "Backend (Secret)",
        },
        "GROQ_MODEL": {
            "configured": True,
            "value": settings.GROQ_MODEL,
            "target": "Groq AI LLM model identifier",
            "scope": "Backend",
        },
        "UNSPLASH_ACCESS_KEY": {
            "configured": bool(settings.is_unsplash_configured),
            "target": "Unsplash destination photo API access key",
            "scope": "Backend (Secret)",
        },
        "UNSPLASH_APP_NAME": {
            "configured": True,
            "value": settings.UNSPLASH_APP_NAME,
            "target": "Unsplash application identification name",
            "scope": "Backend",
        },
    }

    return {
        "status": "ok",
        "environment": settings.ENVIRONMENT,
        "services": services,
        "variables": variables,
    }
