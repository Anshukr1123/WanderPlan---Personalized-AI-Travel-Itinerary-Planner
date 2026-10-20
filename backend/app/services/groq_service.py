"""Groq AI Service for intelligent itinerary generation and regeneration.
Communicates with https://api.groq.com/openai/v1/chat/completions using JSON mode.
Includes bounded exponential retries, timeouts, rate-limit handling, and validation.
"""
from __future__ import annotations
import json
import logging
import time
from typing import Dict, Any, Optional, List
from app.services.http_client import get_async_client

from app.config import settings
from app.schemas.itinerary import (
    ItineraryGenerationRequest,
    ItineraryDayCreate,
    ActivityCreate,
)

logger = logging.getLogger(__name__)

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODELS_URL = "https://api.groq.com/openai/v1/models"

class GroqServiceError(Exception):
    """Custom exception for Groq service operations."""
    def __init__(self, message: str, status_code: int = 500, details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details or {}


class GroqService:
    """Production client for Groq AI API with robust error handling and structured output."""

    def __init__(self) -> None:
        self.api_key = settings.GROQ_API_KEY
        self.model = settings.GROQ_MODEL
        self.timeout = settings.GROQ_TIMEOUT_SECONDS
        self.max_retries = settings.GROQ_MAX_RETRIES

    def _get_headers(self) -> Dict[str, str]:
        if not self.api_key:
            raise GroqServiceError("GROQ_API_KEY is not configured.", status_code=503)
        return {
            "Authorization": f"Bearer {self.api_key.strip()}",
            "Content-Type": "application/json",
            "User-Agent": "WanderPlan/1.0",
        }

    async def check_availability(self) -> Dict[str, Any]:
        """Verify Groq API credentials and configured model availability."""
        if not settings.is_groq_configured:
            return {
                "available": False,
                "configured": False,
                "model": self.model,
                "message": "GROQ_API_KEY is not set in environment variables.",
            }

        headers = self._get_headers()
        try:
            async with get_async_client(timeout=10.0) as client:
                response = await client.get(GROQ_MODELS_URL, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    models = [m.get("id") for m in data.get("data", [])]
                    is_model_present = self.model in models
                    return {
                        "available": True,
                        "configured": True,
                        "model": self.model,
                        "model_confirmed": is_model_present,
                        "total_models": len(models),
                        "message": f"Connected to Groq. Model '{self.model}' is {'confirmed' if is_model_present else 'ready'}.",
                    }
                elif response.status_code == 401:
                    return {
                        "available": False,
                        "configured": True,
                        "model": self.model,
                        "message": "Groq API key is invalid or unauthorized.",
                    }
                else:
                    return {
                        "available": False,
                        "configured": True,
                        "model": self.model,
                        "message": f"Groq API returned HTTP {response.status_code}: {response.text[:200]}",
                    }
        except Exception as exc:
            logger.warning("Groq availability check failed: %s", exc)
            return {
                "available": False,
                "configured": True,
                "model": self.model,
                "message": f"Network error checking Groq API: {str(exc)}",
            }

    async def _call_chat_completion(
        self, messages: List[Dict[str, str]], temperature: float = 0.5
    ) -> Dict[str, Any]:
        """Execute chat completion with bounded exponential retry for rate limits and 5xx errors."""
        headers = self._get_headers()
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "response_format": {"type": "json_object"},
        }

        last_error = None
        for attempt in range(1, self.max_retries + 1):
            try:
                async with get_async_client(timeout=self.timeout) as client:
                    response = await client.post(GROQ_API_URL, headers=headers, json=payload)

                    if response.status_code == 200:
                        data = response.json()
                        choices = data.get("choices", [])
                        if not choices:
                            raise GroqServiceError("Groq returned an empty response choices list.")
                        content = choices[0].get("message", {}).get("content", "")
                        try:
                            return json.loads(content)
                        except json.JSONDecodeError as json_err:
                            logger.error("Groq JSON parsing error: %s. Content: %s", json_err, content[:300])
                            # Retry if attempt < max
                            if attempt < self.max_retries:
                                continue
                            raise GroqServiceError("Groq output was not valid JSON.", status_code=502)

                    elif response.status_code == 429:
                        retry_after = float(response.headers.get("retry-after", str(2 ** attempt)))
                        logger.warning("Groq rate limit encountered. Backing off for %.1fs (attempt %d/%d)", retry_after, attempt, self.max_retries)
                        time.sleep(retry_after)
                        continue

                    elif response.status_code in (500, 502, 503, 504):
                        backoff = 1.5 ** attempt
                        logger.warning("Groq temporary server error (%d). Retrying in %.1fs (attempt %d/%d)", response.status_code, backoff, attempt, self.max_retries)
                        time.sleep(backoff)
                        continue

                    elif response.status_code == 401:
                        raise GroqServiceError("Invalid Groq API Key. Please verify GROQ_API_KEY.", status_code=401)
                    else:
                        raise GroqServiceError(
                            f"Groq API returned HTTP {response.status_code}: {response.text[:300]}",
                            status_code=response.status_code
                        )

            except httpx.TimeoutException:
                logger.warning("Groq request timed out (attempt %d/%d)", attempt, self.max_retries)
                if attempt == self.max_retries:
                    raise GroqServiceError("Groq AI service timed out after multiple attempts.", status_code=504)
                time.sleep(1.0 * attempt)
            except GroqServiceError:
                raise
            except Exception as exc:
                last_error = exc
                logger.warning("Groq request exception: %s (attempt %d/%d)", exc, attempt, self.max_retries)
                if attempt == self.max_retries:
                    raise GroqServiceError(f"Groq API communication failed: {str(exc)}", status_code=500)
                time.sleep(1.0 * attempt)

        raise GroqServiceError(f"Failed to communicate with Groq AI after {self.max_retries} retries: {last_error}")

    async def generate_itinerary(self, req: ItineraryGenerationRequest) -> Dict[str, Any]:
        """Generate a complete structured day-by-day travel itinerary."""
        system_prompt = (
            "You are a world-class travel planner and destination concierge. "
            "Generate an expertly curated, realistic, day-by-day travel itinerary. "
            "You MUST respond ONLY with a valid JSON object matching the exact requested schema. "
            "Do not include markdown codeblocks or text outside the JSON object. "
            "Include realistic times, activity durations, cost estimates in the specified currency, "
            "specific venue names, practical logistics, and neighborhood transit tips."
        )

        user_prompt = f"""
Plan a personalized travel itinerary with the following parameters:
- Destination: {req.destination} {f'({req.country})' if req.country else ''}
- Duration: {req.duration_days} full days
- Budget Tier: {req.budget_tier} (backpacker, moderate, luxury, or ultra-luxury)
- Travel Style: {req.travel_style} (cultural, adventurous, relaxed, culinary, balanced, etc.)
- Party Size: {req.party_size} person(s)
- Pace: {req.pace} (relaxed = 2-3 activities/day, moderate = 3-4 activities/day, fast-paced = 4-5 activities/day)
- Special Interests: {', '.join(req.interests) if req.interests else 'General highlights, culture, food'}
- Dietary Preferences: {req.dietary_preferences or 'None specified'}
- Accessibility / Mobility: {req.accessibility_notes or 'Standard mobility'}
- Preferred Currency: {req.preferred_currency}
- Start Date: {req.start_date or 'Flexible'}

Provide your response strictly in the following JSON structure:
{{
  "title": "A compelling title for the journey",
  "destination": "{req.destination}",
  "country": "{req.country or ''}",
  "duration_days": {req.duration_days},
  "budget_tier": "{req.budget_tier}",
  "estimated_total_cost": 0.0,
  "currency": "{req.preferred_currency}",
  "travel_style": "{req.travel_style}",
  "overview": "A 2-3 sentence evocative summary of the journey",
  "best_time_to_visit_tips": "Practical weather, packing, and seasonal advice",
  "daily_budget_guideline": "Estimated average daily spend per person",
  "days": [
    {{
      "day_number": 1,
      "title": "Title describing the day's theme",
      "theme": "Theme, e.g. Historic Heart & Twilight Vistas",
      "daily_summary": "Summary of what this day entails",
      "accommodation_suggestion": "Recommended hotel/area suited to budget tier",
      "estimated_day_cost": 0.0,
      "activities": [
        {{
          "time_slot": "09:00 AM",
          "sort_order": 0,
          "title": "Specific attraction or spot name",
          "description": "Rich description of the experience and what to see",
          "activity_type": "sightseeing",
          "location_name": "Specific neighborhood, landmark, or street",
          "duration_minutes": 90,
          "estimated_cost": 25.0,
          "currency": "{req.preferred_currency}",
          "booking_required": true,
          "tips": "Practical tip (e.g., book tickets online 3 days ahead, sunrise spot)"
        }}
      ]
    }}
  ]
}}
"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        raw_result = await self._call_chat_completion(messages, temperature=0.6)
        return self._normalize_itinerary_result(raw_result, req)

    async def regenerate_single_day(
        self,
        destination: str,
        day_number: int,
        duration_days: int,
        budget_tier: str,
        travel_style: str,
        currency: str,
        existing_day_data: Optional[Dict[str, Any]] = None,
        custom_instructions: Optional[str] = None
    ) -> Dict[str, Any]:
        """Regenerate a single day in an itinerary with optional custom instructions."""
        system_prompt = (
            "You are a professional travel planner. Regenerate a single day for an existing itinerary. "
            "You MUST respond ONLY with a valid JSON object matching the requested day structure."
        )

        user_prompt = f"""
Regenerate Day {day_number} of a {duration_days}-day trip to {destination}.
- Budget Tier: {budget_tier}
- Travel Style: {travel_style}
- Currency: {currency}
- Custom User Feedback/Requirements: {custom_instructions or 'Provide fresh, exciting alternative activities that fit well.'}

Existing Day Plan to replace:
{json.dumps(existing_day_data or {}, indent=2)}

Output strictly the JSON for this single day in this format:
{{
  "day_number": {day_number},
  "title": "Updated Day Title",
  "theme": "Updated Theme",
  "daily_summary": "Updated summary of the day",
  "accommodation_suggestion": "Suggested stay/neighborhood",
  "estimated_day_cost": 0.0,
  "activities": [
    {{
      "time_slot": "09:30 AM",
      "sort_order": 0,
      "title": "Specific Attraction",
      "description": "Engaging description",
      "activity_type": "sightseeing",
      "location_name": "Neighborhood / District",
      "duration_minutes": 90,
      "estimated_cost": 20.0,
      "currency": "{currency}",
      "booking_required": false,
      "tips": "Local guidance"
    }}
  ]
}}
"""
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        raw_result = await self._call_chat_completion(messages, temperature=0.7)
        # Ensure day_number matches
        raw_result["day_number"] = day_number
        return raw_result

    async def regenerate_activity(
        self,
        destination: str,
        day_title: str,
        time_slot: str,
        currency: str,
        current_activity: Dict[str, Any],
        custom_instructions: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate a replacement activity with custom criteria."""
        system_prompt = (
            "You are a destination expert. Provide a top-tier alternative activity to replace an existing one. "
            "Respond strictly in JSON format matching the activity schema."
        )

        user_prompt = f"""
Replace an activity in {destination} for the day '{day_title}' during '{time_slot}'.
- Current Activity to Replace: {current_activity.get('title', '')} ({current_activity.get('description', '')})
- Currency: {currency}
- User Specific Preferences: {custom_instructions or 'Offer a distinctive, highly rated alternative experience'}

Respond strictly with:
{{
  "time_slot": "{time_slot}",
  "sort_order": {current_activity.get('sort_order', 0)},
  "title": "New Activity Name",
  "description": "Engaging, practical description",
  "activity_type": "sightseeing",
  "location_name": "Location or neighborhood",
  "duration_minutes": {current_activity.get('duration_minutes', 90)},
  "estimated_cost": {current_activity.get('estimated_cost', 0.0)},
  "currency": "{currency}",
  "booking_required": false,
  "tips": "Helpful insider tip"
}}
"""
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        return await self._call_chat_completion(messages, temperature=0.7)

    def _normalize_itinerary_result(
        self, data: Dict[str, Any], req: ItineraryGenerationRequest
    ) -> Dict[str, Any]:
        """Validate and calculate totals across all generated days and activities."""
        days = data.get("days", [])
        total_trip_cost = 0.0

        normalized_days = []
        for i, day in enumerate(days, start=1):
            day_number = day.get("day_number", i)
            activities = day.get("activities", [])
            day_cost = 0.0

            normalized_activities = []
            for j, act in enumerate(activities):
                cost = float(act.get("estimated_cost", 0.0) or 0.0)
                day_cost += cost
                normalized_activities.append({
                    "time_slot": act.get("time_slot", "Morning"),
                    "sort_order": act.get("sort_order", j),
                    "title": act.get("title", f"Activity {j+1}"),
                    "description": act.get("description", "Discover local highlights and culture."),
                    "activity_type": act.get("activity_type", "sightseeing"),
                    "location_name": act.get("location_name", req.destination),
                    "duration_minutes": int(act.get("duration_minutes", 90) or 90),
                    "estimated_cost": cost,
                    "currency": act.get("currency", req.preferred_currency),
                    "booking_required": bool(act.get("booking_required", False)),
                    "tips": act.get("tips", ""),
                })

            total_trip_cost += day_cost
            normalized_days.append({
                "day_number": day_number,
                "title": day.get("title", f"Day {day_number} Exploration"),
                "theme": day.get("theme", "Exploration"),
                "daily_summary": day.get("daily_summary", ""),
                "accommodation_suggestion": day.get("accommodation_suggestion", f"Recommended hotel in {req.destination}"),
                "estimated_day_cost": round(day_cost, 2),
                "activities": normalized_activities,
            })

        data["days"] = normalized_days
        data["estimated_total_cost"] = round(total_trip_cost, 2)
        data["destination"] = req.destination
        data["duration_days"] = len(normalized_days)
        data["budget_tier"] = req.budget_tier
        data["currency"] = req.preferred_currency
        return data


groq_service = GroqService()
