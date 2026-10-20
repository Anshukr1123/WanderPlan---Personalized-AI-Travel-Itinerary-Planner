"""FastAPI Main Application Entry Point for WanderPlan Backend.
Production-ready configuration for deployment on Render.
"""
from __future__ import annotations
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.routes.health import router as health_router
from app.routes.itinerary import router as itinerary_router
from app.routes.trips import router as trips_router
from app.routes.images import router as images_router

# Configure logging
logging.basicConfig(
    level=logging.INFO if settings.ENVIRONMENT == "production" else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("wanderplan.api")

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("Starting WanderPlan API (Env: %s, Port: %d)", settings.ENVIRONMENT, settings.PORT)
    logger.info("Groq AI Configured: %s (Model: %s)", settings.is_groq_configured, settings.GROQ_MODEL)
    logger.info("Unsplash Configured: %s", settings.is_unsplash_configured)
    logger.info("Supabase Configured: %s", settings.is_supabase_configured)
    yield
    logger.info("Shutting down WanderPlan API.")

app = FastAPI(
    title="WanderPlan API",
    description="Personalized AI Travel Itinerary Planner API powered by Groq, Supabase, and Unsplash.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS Middleware setup
# Allows local dev origins and production Vercel frontend domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_origin_regex=r"^https://.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handler to ensure clean, structured JSON and prevent secret leakage
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error("Unhandled exception processing %s %s: %s", request.method, request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error_code": "INTERNAL_SERVER_ERROR",
            "message": "An internal server error occurred. Please try again shortly.",
        }
    )

# Include Routers
app.include_router(health_router)
app.include_router(itinerary_router)
app.include_router(trips_router)
app.include_router(images_router)

@app.get("/", summary="Root landing endpoint")
async def root() -> dict:
    return {
        "app": "WanderPlan API",
        "version": "1.0.0",
        "status": "online",
        "documentation": "/docs",
        "health": "/health",
        "services_status": "/api/services/status"
    }
