"""Unsplash Image Service for travel destinations.
Implements official Unsplash API search with required photographer attribution,
download tracking, rate limit handling, and robust curated fallbacks.
"""
from __future__ import annotations
import logging
from typing import Dict, Any, List, Optional
from app.services.http_client import get_async_client

from app.config import settings
from app.schemas.image import DestinationImage, UnsplashAttribution, ImageSearchResponse

logger = logging.getLogger(__name__)

UNSPLASH_SEARCH_URL = "https://api.unsplash.com/search/photos"
UNSPLASH_RANDOM_URL = "https://api.unsplash.com/photos/random"

# Curated fallback imagery for popular global destinations when credentials are absent
FALLBACK_DESTINATION_IMAGES: Dict[str, List[Dict[str, Any]]] = {
    "default": [
        {
            "id": "fb-travel-1",
            "url_regular": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80",
            "url_thumb": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=400&q=80",
            "alt_description": "Scenic traveler overlooking mountain valley",
            "photographer_name": "Annie Spratt",
            "photographer_username": "anniespratt",
            "photographer_profile_url": "https://unsplash.com/@anniespratt?utm_source=wanderplan&utm_medium=referral",
        },
        {
            "id": "fb-travel-2",
            "url_regular": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
            "url_thumb": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80",
            "alt_description": "Tropical turquoise ocean beach and palms",
            "photographer_name": "Sean Oulashin",
            "photographer_username": "oulashin",
            "photographer_profile_url": "https://unsplash.com/@oulashin?utm_source=wanderplan&utm_medium=referral",
        },
    ],
    "tokyo": [
        {
            "id": "fb-tokyo-1",
            "url_regular": "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80",
            "url_thumb": "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=400&q=80",
            "alt_description": "Tokyo skyline illuminated with Tokyo Tower at dusk",
            "photographer_name": "Yu Kato",
            "photographer_username": "yukato",
            "photographer_profile_url": "https://unsplash.com/@yukato?utm_source=wanderplan&utm_medium=referral",
        }
    ],
    "paris": [
        {
            "id": "fb-paris-1",
            "url_regular": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80",
            "url_thumb": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=400&q=80",
            "alt_description": "Eiffel Tower viewed over Parisian boulevard",
            "photographer_name": "Anthony Delanoix",
            "photographer_username": "anthonydelanoix",
            "photographer_profile_url": "https://unsplash.com/@anthonydelanoix?utm_source=wanderplan&utm_medium=referral",
        }
    ],
    "rome": [
        {
            "id": "fb-rome-1",
            "url_regular": "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1200&q=80",
            "url_thumb": "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=400&q=80",
            "alt_description": "The historic Colosseum in Rome under clear sunset sky",
            "photographer_name": "David Kohler",
            "photographer_username": "davidkohler",
            "photographer_profile_url": "https://unsplash.com/@davidkohler?utm_source=wanderplan&utm_medium=referral",
        }
    ],
    "new york": [
        {
            "id": "fb-nyc-1",
            "url_regular": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=1200&q=80",
            "url_thumb": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=400&q=80",
            "alt_description": "Manhattan skyline across New York harbor",
            "photographer_name": "Oliver Niblett",
            "photographer_username": "oliverniblett",
            "photographer_profile_url": "https://unsplash.com/@oliverniblett?utm_source=wanderplan&utm_medium=referral",
        }
    ]
}


class UnsplashService:
    """Service client for Unsplash API with attribution compliance and graceful fallbacks."""

    def __init__(self) -> None:
        self.access_key = settings.UNSPLASH_ACCESS_KEY
        self.timeout = settings.UNSPLASH_TIMEOUT_SECONDS
        self.app_name = settings.UNSPLASH_APP_NAME

    def _get_headers(self) -> Dict[str, str]:
        headers = {
            "Accept-Version": "v1",
            "User-Agent": f"{self.app_name}/1.0",
        }
        if self.access_key:
            headers["Authorization"] = f"Client-ID {self.access_key.strip()}"
        return headers

    async def check_availability(self) -> Dict[str, Any]:
        """Verify Unsplash API connectivity and remaining rate limit."""
        if not settings.is_unsplash_configured:
            return {
                "available": False,
                "configured": False,
                "message": "UNSPLASH_ACCESS_KEY is not configured. Serving high-fidelity curated fallbacks.",
            }

        headers = self._get_headers()
        try:
            async with get_async_client(timeout=self.timeout) as client:
                response = await client.get(
                    UNSPLASH_SEARCH_URL,
                    headers=headers,
                    params={"query": "travel", "per_page": 1}
                )
                rate_remaining = response.headers.get("x-ratelimit-remaining", "unknown")
                rate_limit = response.headers.get("x-ratelimit-limit", "unknown")

                if response.status_code == 200:
                    return {
                        "available": True,
                        "configured": True,
                        "rate_limit": rate_limit,
                        "rate_remaining": rate_remaining,
                        "message": f"Connected to Unsplash API. Requests remaining: {rate_remaining}/{rate_limit}",
                    }
                elif response.status_code == 401:
                    return {
                        "available": False,
                        "configured": True,
                        "message": "Unsplash Access Key is invalid or rejected.",
                    }
                elif response.status_code == 403:
                    return {
                        "available": False,
                        "configured": True,
                        "message": "Unsplash API rate limit exceeded (50 req/hr on demo tier). Serving fallbacks.",
                    }
                else:
                    return {
                        "available": False,
                        "configured": True,
                        "message": f"Unsplash returned HTTP {response.status_code}",
                    }
        except Exception as exc:
            return {
                "available": False,
                "configured": True,
                "message": f"Network error contacting Unsplash: {str(exc)}",
            }

    async def search_photos(self, query: str, per_page: int = 5) -> ImageSearchResponse:
        """Search Unsplash photos with strict attribution and graceful fallbacks."""
        clean_query = query.strip()
        if not clean_query:
            clean_query = "travel"

        # If not configured, immediately return curated destination fallbacks
        if not settings.is_unsplash_configured:
            logger.info("Unsplash not configured; returning curated fallbacks for: %s", clean_query)
            return self._get_fallback_response(clean_query, per_page)

        headers = self._get_headers()
        params = {
            "query": f"{clean_query} landmark travel",
            "per_page": min(per_page, 20),
            "orientation": "landscape",
        }

        try:
            async with get_async_client(timeout=self.timeout) as client:
                response = await client.get(UNSPLASH_SEARCH_URL, headers=headers, params=params)

                if response.status_code == 200:
                    data = response.json()
                    results = data.get("results", [])
                    images = []

                    for item in results:
                        user = item.get("user", {})
                        urls = item.get("urls", {})
                        links = item.get("links", {})

                        username = user.get("username", "traveler")
                        name = user.get("name", "Photographer")
                        profile_url = f"https://unsplash.com/@{username}?utm_source=wanderplan&utm_medium=referral"

                        attribution = UnsplashAttribution(
                            photographer_name=name,
                            photographer_username=username,
                            photographer_profile_url=profile_url,
                            download_location=links.get("download_location"),
                        )

                        images.append(
                            DestinationImage(
                                id=item.get("id", ""),
                                url_regular=urls.get("regular", urls.get("small", "")),
                                url_thumb=urls.get("thumb", urls.get("small", "")),
                                url_full=urls.get("full", urls.get("regular", "")),
                                alt_description=item.get("alt_description") or f"View of {clean_query}",
                                attribution=attribution,
                                is_fallback=False,
                            )
                        )

                    if images:
                        return ImageSearchResponse(
                            query=clean_query,
                            total_results=data.get("total", len(images)),
                            images=images,
                        )

                elif response.status_code == 403:
                    logger.warning("Unsplash 403 rate limit. Falling back to local curated images.")
                else:
                    logger.warning("Unsplash API returned %s. Falling back to curated images.", response.status_code)

        except Exception as exc:
            logger.warning("Error fetching from Unsplash (%s). Serving curated fallbacks.", exc)

        return self._get_fallback_response(clean_query, per_page)

    def _get_fallback_response(self, query: str, per_page: int) -> ImageSearchResponse:
        """Construct fallback response with transparent is_fallback=True flagging."""
        query_lower = query.lower()
        matched_items = None

        for key, items in FALLBACK_DESTINATION_IMAGES.items():
            if key != "default" and key in query_lower:
                matched_items = items
                break

        if not matched_items:
            matched_items = FALLBACK_DESTINATION_IMAGES["default"]

        images = []
        for item in matched_items[:per_page]:
            attribution = UnsplashAttribution(
                photographer_name=item["photographer_name"],
                photographer_username=item["photographer_username"],
                photographer_profile_url=item["photographer_profile_url"],
            )
            images.append(
                DestinationImage(
                    id=item["id"],
                    url_regular=item["url_regular"],
                    url_thumb=item["url_thumb"],
                    url_full=item["url_regular"],
                    alt_description=item["alt_description"],
                    attribution=attribution,
                    is_fallback=True,
                )
            )

        return ImageSearchResponse(
            query=query,
            total_results=len(images),
            images=images,
        )

    async def trigger_download_tracking(self, download_location: str) -> None:
        """Unsplash API requirement: Trigger download endpoint when photo is selected."""
        if not download_location or not settings.is_unsplash_configured:
            return
        headers = self._get_headers()
        try:
            async with get_async_client(timeout=5.0) as client:
                await client.get(download_location, headers=headers)
        except Exception as exc:
            logger.debug("Unsplash download tracking exception (non-critical): %s", exc)


unsplash_service = UnsplashService()
