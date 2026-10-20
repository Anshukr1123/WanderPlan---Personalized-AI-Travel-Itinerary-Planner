"""Schemas for itineraries, days, activities, and AI generation."""
from __future__ import annotations
from typing import Optional, List
from .compat import BaseModel, Field

class ActivityBase(BaseModel):
    time_slot: str = Field(..., description="Time of day, e.g. 09:00 AM or Morning")
    sort_order: int = Field(0, description="Order within the day")
    title: str = Field(..., description="Name of the attraction or activity")
    description: str = Field(..., description="Rich description and recommendations")
    activity_type: str = Field("sightseeing", description="sightseeing, dining, transportation, leisure, culture")
    location_name: Optional[str] = Field(None, description="Physical location or neighborhood")
    duration_minutes: int = Field(90, description="Estimated duration in minutes")
    estimated_cost: float = Field(0.0, description="Estimated cost in local/trip currency")
    currency: str = Field("USD", description="Currency code")
    booking_required: bool = Field(False, description="Whether advance booking/ticket is recommended")
    tips: Optional[str] = Field(None, description="Insider tips, best time to visit, transit guidance")

class ActivityCreate(ActivityBase):
    pass

class ActivityUpdate(BaseModel):
    time_slot: Optional[str] = None
    sort_order: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    activity_type: Optional[str] = None
    location_name: Optional[str] = None
    duration_minutes: Optional[int] = None
    estimated_cost: Optional[float] = None
    currency: Optional[str] = None
    booking_required: Optional[bool] = None
    tips: Optional[str] = None

class ActivityResponse(ActivityBase):
    id: str
    day_id: str
    trip_id: str

class ItineraryDayBase(BaseModel):
    day_number: int = Field(..., ge=1, le=30)
    date: Optional[str] = None
    title: str = Field(..., description="Theme/headline for the day")
    theme: Optional[str] = None
    daily_summary: Optional[str] = None
    accommodation_suggestion: Optional[str] = None
    estimated_day_cost: float = Field(0.0)

class ItineraryDayCreate(ItineraryDayBase):
    activities: List[ActivityCreate] = []

class ItineraryDayResponse(ItineraryDayBase):
    id: str
    trip_id: str
    activities: List[ActivityResponse] = []

class ItineraryGenerationRequest(BaseModel):
    destination: str = Field(..., min_length=2, max_length=120)
    country: Optional[str] = None
    duration_days: int = Field(3, ge=1, le=14)
    budget_tier: str = Field("moderate", pattern="^(backpacker|moderate|luxury|ultra-luxury)$")
    travel_style: str = Field("balanced", description="cultural, adventurous, relaxed, culinary, balanced")
    party_size: int = Field(1, ge=1, le=20)
    pace: str = Field("moderate", pattern="^(relaxed|moderate|fast-paced)$")
    interests: List[str] = Field(default_factory=list)
    dietary_preferences: Optional[str] = None
    accessibility_notes: Optional[str] = None
    preferred_currency: str = Field("USD")
    start_date: Optional[str] = None

class RegenerateDayRequest(BaseModel):
    day_number: int = Field(..., ge=1)
    custom_instructions: Optional[str] = Field(None, description="Specific feedback or requirements for this day")

class RegenerateActivityRequest(BaseModel):
    activity_id: str
    custom_instructions: Optional[str] = Field(None, description="Feedback or preferred alternative for this activity")
