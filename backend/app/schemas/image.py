"""Image schemas with Unsplash API attribution requirements."""
from __future__ import annotations
from typing import Optional, List
from .compat import BaseModel, Field

class UnsplashAttribution(BaseModel):
    """Complies with Unsplash API Guidelines for user attribution."""
    photographer_name: str
    photographer_username: str
    photographer_profile_url: str
    unsplash_referral_url: str = "https://unsplash.com/?utm_source=wanderplan&utm_medium=referral"
    download_location: Optional[str] = None

class DestinationImage(BaseModel):
    id: str
    url_regular: str
    url_thumb: str
    url_full: Optional[str] = None
    alt_description: Optional[str] = None
    attribution: UnsplashAttribution
    is_fallback: bool = False

class ImageSearchResponse(BaseModel):
    query: str
    total_results: int
    images: List[DestinationImage]
