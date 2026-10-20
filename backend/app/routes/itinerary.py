"""Itinerary generation and regeneration endpoints using Groq AI."""
from __future__ import annotations
import logging
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, status, Body

from app.schemas.itinerary import (
    ItineraryGenerationRequest,
    RegenerateDayRequest,
    RegenerateActivityRequest,
)
from app.services.groq_service import groq_service, GroqServiceError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/itinerary", tags=["Itinerary Generation"])

@router.post("/generate", summary="Generate a complete structured travel itinerary")
async def generate_itinerary(req: ItineraryGenerationRequest) -> Dict[str, Any]:
    """Generate structured day-by-day travel plan using Groq AI."""
    try:
        result = await groq_service.generate_itinerary(req)
        return {"success": True, "data": result}
    except GroqServiceError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"error_code": "GROQ_ERROR", "message": exc.message, "details": exc.details}
        )
    except Exception as exc:
        logger.error("Unexpected error in itinerary generation: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error_code": "GENERATION_FAILED", "message": f"Failed to generate itinerary: {str(exc)}"}
        )

@router.post("/regenerate-day", summary="Regenerate a specific day in an itinerary")
async def regenerate_day(
    destination: str = Body(..., embed=True),
    day_number: int = Body(..., embed=True),
    duration_days: int = Body(..., embed=True),
    budget_tier: str = Body("moderate", embed=True),
    travel_style: str = Body("balanced", embed=True),
    currency: str = Body("USD", embed=True),
    existing_day: Dict[str, Any] = Body(default_factory=dict, embed=True),
    custom_instructions: str = Body(None, embed=True),
) -> Dict[str, Any]:
    """Regenerate a single day with optional custom instructions and feedback."""
    try:
        updated_day = await groq_service.regenerate_single_day(
            destination=destination,
            day_number=day_number,
            duration_days=duration_days,
            budget_tier=budget_tier,
            travel_style=travel_style,
            currency=currency,
            existing_day_data=existing_day,
            custom_instructions=custom_instructions,
        )
        return {"success": True, "data": updated_day}
    except GroqServiceError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"error_code": "GROQ_ERROR", "message": exc.message}
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error_code": "REGENERATE_FAILED", "message": str(exc)}
        )

@router.post("/regenerate-activity", summary="Generate a replacement for a specific activity")
async def regenerate_activity(
    destination: str = Body(..., embed=True),
    day_title: str = Body(..., embed=True),
    time_slot: str = Body("Morning", embed=True),
    currency: str = Body("USD", embed=True),
    current_activity: Dict[str, Any] = Body(..., embed=True),
    custom_instructions: str = Body(None, embed=True),
) -> Dict[str, Any]:
    """Provide a replacement activity tailored to user instructions."""
    try:
        new_activity = await groq_service.regenerate_activity(
            destination=destination,
            day_title=day_title,
            time_slot=time_slot,
            currency=currency,
            current_activity=current_activity,
            custom_instructions=custom_instructions,
        )
        return {"success": True, "data": new_activity}
    except GroqServiceError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"error_code": "GROQ_ERROR", "message": exc.message}
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error_code": "REGENERATE_ACTIVITY_FAILED", "message": str(exc)}
        )
