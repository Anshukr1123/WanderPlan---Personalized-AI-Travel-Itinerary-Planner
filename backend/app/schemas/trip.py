"""Trip request and response schemas."""
from __future__ import annotations
from typing import Optional, List
from .compat import BaseModel, Field
from .itinerary import ItineraryDayCreate, ItineraryDayResponse

class TripBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=150)
    destination: str = Field(..., min_length=2, max_length=120)
    country: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    duration_days: int = Field(..., ge=1, le=30)
    budget_tier: str = Field("moderate", pattern="^(backpacker|moderate|luxury|ultra-luxury)$")
    estimated_total_cost: float = Field(0.0)
    currency: str = Field("USD")
    travel_style: str = Field("balanced")
    party_size: int = Field(1, ge=1)
    pace: str = Field("moderate")
    cover_image_url: Optional[str] = None
    cover_image_photographer: Optional[str] = None
    cover_image_photographer_url: Optional[str] = None
    notes: Optional[str] = None
    is_public: bool = Field(False)

class TripCreate(TripBase):
    days: List[ItineraryDayCreate] = []

class TripUpdate(BaseModel):
    title: Optional[str] = None
    destination: Optional[str] = None
    country: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    budget_tier: Optional[str] = None
    estimated_total_cost: Optional[float] = None
    currency: Optional[str] = None
    travel_style: Optional[str] = None
    party_size: Optional[int] = None
    pace: Optional[str] = None
    cover_image_url: Optional[str] = None
    cover_image_photographer: Optional[str] = None
    cover_image_photographer_url: Optional[str] = None
    notes: Optional[str] = None
    is_public: Optional[bool] = None

class TripSummary(TripBase):
    id: str
    user_id: str
    created_at: str
    updated_at: str

class TripDetail(TripSummary):
    days: List[ItineraryDayResponse] = []
