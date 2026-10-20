"""Supabase Service for server-side authentication verification and PostgREST persistence.
Enforces Row Level Security (RLS) and authenticates incoming Bearer tokens with Supabase Auth.
"""
from __future__ import annotations
import logging
from typing import Dict, Any, List, Optional
from app.services.http_client import get_async_client

from app.config import settings

logger = logging.getLogger(__name__)

class SupabaseServiceError(Exception):
    def __init__(self, message: str, status_code: int = 400, details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details or {}


class SupabaseService:
    """Manages Supabase Auth user verification and PostgREST database operations."""

    def __init__(self) -> None:
        self.base_url = settings.SUPABASE_URL
        self.anon_key = settings.SUPABASE_ANON_KEY
        self.service_role_key = settings.SUPABASE_SERVICE_ROLE_KEY

    def _ensure_configured(self) -> None:
        if not settings.is_supabase_configured:
            raise SupabaseServiceError(
                "Supabase is not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY in your environment variables.",
                status_code=503,
                details={
                    "missing": [
                        k for k, v in [
                            ("SUPABASE_URL", self.base_url),
                            ("SUPABASE_ANON_KEY", self.anon_key)
                        ] if not v
                    ]
                }
            )

    async def check_availability(self) -> Dict[str, Any]:
        """Verify Supabase connectivity and schema existence."""
        if not settings.is_supabase_configured:
            return {
                "available": False,
                "configured": False,
                "url": self.base_url or "Not set",
                "message": "SUPABASE_URL or SUPABASE_ANON_KEY is not configured.",
            }

        headers = {
            "apikey": self.anon_key,
            "Authorization": f"Bearer {self.anon_key}",
        }

        try:
            async with get_async_client(timeout=8.0) as client:
                # Probe PostgREST root OpenAPI endpoint
                response = await client.get(f"{self.base_url}/rest/v1/", headers=headers)
                if response.status_code == 200:
                    return {
                        "available": True,
                        "configured": True,
                        "url": self.base_url,
                        "message": "Successfully connected to Supabase PostgREST & Auth.",
                    }
                elif response.status_code == 401:
                    return {
                        "available": False,
                        "configured": True,
                        "url": self.base_url,
                        "message": "Supabase API key is unauthorized or rejected.",
                    }
                else:
                    return {
                        "available": False,
                        "configured": True,
                        "url": self.base_url,
                        "message": f"Supabase responded with HTTP {response.status_code}",
                    }
        except Exception as exc:
            return {
                "available": False,
                "configured": True,
                "url": self.base_url,
                "message": f"Failed to connect to Supabase: {str(exc)}",
            }

    async def verify_user_token(self, token: str) -> Dict[str, Any]:
        """Verify an authenticated user's JWT with Supabase Auth API."""
        self._ensure_configured()
        clean_token = token.strip()
        if clean_token.startswith("Bearer "):
            clean_token = clean_token[7:].strip()

        if not clean_token:
            raise SupabaseServiceError("Authorization token is missing or empty.", status_code=401)

        headers = {
            "apikey": self.anon_key,
            "Authorization": f"Bearer {clean_token}",
        }

        auth_url = f"{self.base_url}/auth/v1/user"
        try:
            async with get_async_client(timeout=8.0) as client:
                response = await client.get(auth_url, headers=headers)
                if response.status_code == 200:
                    user_data = response.json()
                    return user_data
                elif response.status_code == 401:
                    raise SupabaseServiceError("Invalid or expired session token. Please sign in again.", status_code=401)
                else:
                    raise SupabaseServiceError(f"Supabase Auth returned HTTP {response.status_code}", status_code=response.status_code)
        except SupabaseServiceError:
            raise
        except Exception as exc:
            logger.error("Supabase Auth verification network failure: %s", exc)
            raise SupabaseServiceError(f"Authentication verification failed: {str(exc)}", status_code=502)

    async def list_trips(self, user_token: str) -> List[Dict[str, Any]]:
        """Fetch trips accessible to the user respecting RLS."""
        self._ensure_configured()
        headers = {
            "apikey": self.anon_key,
            "Authorization": f"Bearer {user_token}",
            "Content-Type": "application/json",
        }

        url = f"{self.base_url}/rest/v1/trips?select=*&order=created_at.desc"
        try:
            async with get_async_client(timeout=10.0) as client:
                response = await client.get(url, headers=headers)
                if response.status_code == 200:
                    return response.json()
                raise SupabaseServiceError(f"Failed to query trips: {response.text}", status_code=response.status_code)
        except Exception as exc:
            if isinstance(exc, SupabaseServiceError):
                raise
            raise SupabaseServiceError(f"Database query error: {str(exc)}")

    async def get_trip_detail(self, trip_id: str, user_token: str) -> Dict[str, Any]:
        """Fetch full trip with nested itinerary days and activities."""
        self._ensure_configured()
        headers = {
            "apikey": self.anon_key,
            "Authorization": f"Bearer {user_token}",
            "Content-Type": "application/json",
        }

        # Query trip with days and activities in single query via PostgREST embedding
        url = (
            f"{self.base_url}/rest/v1/trips?id=eq.{trip_id}"
            f"&select=*,days:itinerary_days(*,activities:activities(*))"
        )

        async with get_async_client(timeout=10.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code == 200:
                results = response.json()
                if not results:
                    raise SupabaseServiceError("Trip not found or you do not have permission to view it.", status_code=404)
                trip = results[0]
                # Sort days and activities
                days = trip.get("days", [])
                days.sort(key=lambda d: d.get("day_number", 0))
                for d in days:
                    acts = d.get("activities", [])
                    acts.sort(key=lambda a: a.get("sort_order", 0))
                trip["days"] = days
                return trip
            raise SupabaseServiceError(f"Failed to fetch trip: {response.text}", status_code=response.status_code)

    async def create_trip_with_itinerary(
        self, trip_data: Dict[str, Any], days_data: List[Dict[str, Any]], user_id: str, user_token: str
    ) -> Dict[str, Any]:
        """Atomically persist a trip along with its days and activities."""
        self._ensure_configured()
        headers = {
            "apikey": self.anon_key,
            "Authorization": f"Bearer {user_token}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }

        trip_payload = {**trip_data, "user_id": user_id}
        trip_url = f"{self.base_url}/rest/v1/trips"

        async with get_async_client(timeout=15.0) as client:
            # 1. Insert Trip
            res = await client.post(trip_url, headers=headers, json=trip_payload)
            if res.status_code not in (200, 201):
                raise SupabaseServiceError(f"Failed to create trip record: {res.text}", status_code=res.status_code)
            created_trip = res.json()[0]
            trip_id = created_trip["id"]

            created_days = []
            # 2. Insert Days & Activities
            for day in days_data:
                day_payload = {
                    "trip_id": trip_id,
                    "day_number": day.get("day_number"),
                    "date": day.get("date"),
                    "title": day.get("title"),
                    "theme": day.get("theme"),
                    "daily_summary": day.get("daily_summary"),
                    "accommodation_suggestion": day.get("accommodation_suggestion"),
                    "estimated_day_cost": day.get("estimated_day_cost", 0.0),
                }

                days_url = f"{self.base_url}/rest/v1/itinerary_days"
                day_res = await client.post(days_url, headers=headers, json=day_payload)
                if day_res.status_code not in (200, 201):
                    logger.error("Failed to insert itinerary day: %s", day_res.text)
                    continue

                created_day = day_res.json()[0]
                day_id = created_day["id"]

                # Insert activities for this day
                activities_to_insert = []
                for act in day.get("activities", []):
                    activities_to_insert.append({
                        "day_id": day_id,
                        "trip_id": trip_id,
                        "time_slot": act.get("time_slot", "Morning"),
                        "sort_order": act.get("sort_order", 0),
                        "title": act.get("title"),
                        "description": act.get("description"),
                        "activity_type": act.get("activity_type", "sightseeing"),
                        "location_name": act.get("location_name"),
                        "duration_minutes": act.get("duration_minutes", 90),
                        "estimated_cost": act.get("estimated_cost", 0.0),
                        "currency": act.get("currency", created_trip.get("currency", "USD")),
                        "booking_required": act.get("booking_required", False),
                        "tips": act.get("tips"),
                    })

                if activities_to_insert:
                    act_url = f"{self.base_url}/rest/v1/activities"
                    act_res = await client.post(act_url, headers=headers, json=activities_to_insert)
                    if act_res.status_code in (200, 201):
                        created_day["activities"] = act_res.json()
                    else:
                        created_day["activities"] = []

                created_days.append(created_day)

            created_trip["days"] = created_days
            return created_trip

    async def update_trip(self, trip_id: str, updates: Dict[str, Any], user_token: str) -> Dict[str, Any]:
        """Update trip attributes."""
        self._ensure_configured()
        headers = {
            "apikey": self.anon_key,
            "Authorization": f"Bearer {user_token}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }

        url = f"{self.base_url}/rest/v1/trips?id=eq.{trip_id}"
        async with get_async_client(timeout=10.0) as client:
            res = await client.patch(url, headers=headers, json=updates)
            if res.status_code in (200, 204):
                data = res.json()
                if data:
                    return data[0]
                return {"id": trip_id, **updates}
            raise SupabaseServiceError(f"Failed to update trip: {res.text}", status_code=res.status_code)

    async def delete_trip(self, trip_id: str, user_token: str) -> bool:
        """Delete a trip and cascade its days and activities."""
        self._ensure_configured()
        headers = {
            "apikey": self.anon_key,
            "Authorization": f"Bearer {user_token}",
        }

        url = f"{self.base_url}/rest/v1/trips?id=eq.{trip_id}"
        async with get_async_client(timeout=10.0) as client:
            res = await client.delete(url, headers=headers)
            if res.status_code in (200, 204):
                return True
            raise SupabaseServiceError(f"Failed to delete trip: {res.text}", status_code=res.status_code)

    async def update_activity(
        self, activity_id: str, updates: Dict[str, Any], user_token: str
    ) -> Dict[str, Any]:
        """Update an activity within a day."""
        self._ensure_configured()
        headers = {
            "apikey": self.anon_key,
            "Authorization": f"Bearer {user_token}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }

        url = f"{self.base_url}/rest/v1/activities?id=eq.{activity_id}"
        async with get_async_client(timeout=8.0) as client:
            res = await client.patch(url, headers=headers, json=updates)
            if res.status_code in (200, 204):
                data = res.json()
                return data[0] if data else {"id": activity_id, **updates}
            raise SupabaseServiceError(f"Failed to update activity: {res.text}", status_code=res.status_code)


supabase_service = SupabaseService()
