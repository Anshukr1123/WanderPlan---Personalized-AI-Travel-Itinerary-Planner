"""Image search routes using Unsplash with attribution compliance."""
from __future__ import annotations
from typing import Dict, Any, Optional
from fastapi import APIRouter, Query, Body

from app.services.unsplash_service import unsplash_service

router = APIRouter(prefix="/api/images", tags=["Destination Images"])

@router.get("/search", summary="Search destination photos via Unsplash")
async def search_destination_images(
    q: str = Query(..., min_length=1, description="Destination city or region name"),
    limit: int = Query(6, ge=1, le=15, description="Number of photos to return"),
) -> Dict[str, Any]:
    response = await unsplash_service.search_photos(query=q, per_page=limit)
    return {"success": True, "data": response.model_dump()}

@router.post("/track-download", summary="Trigger official Unsplash download endpoint requirement")
async def track_download(download_location: str = Body(..., embed=True)) -> Dict[str, bool]:
    await unsplash_service.trigger_download_tracking(download_location)
    return {"success": True}
