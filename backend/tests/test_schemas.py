"""Unit tests for Pydantic/compatible schemas."""
import unittest
from app.schemas.itinerary import (
    ActivityBase,
    ItineraryDayBase,
    ItineraryGenerationRequest,
)
from app.schemas.image import DestinationImage, UnsplashAttribution
from app.schemas.trip import TripBase

class TestSchemas(unittest.TestCase):
    def test_activity_creation(self):
        act = ActivityBase(
            time_slot="09:00 AM",
            title="Tokyo Skytree",
            description="Panoramic city view.",
            activity_type="sightseeing",
            duration_minutes=120,
            estimated_cost=25.0
        )
        self.assertEqual(act.title, "Tokyo Skytree")
        self.assertEqual(act.duration_minutes, 120)
        self.assertEqual(act.estimated_cost, 25.0)

    def test_day_creation(self):
        day = ItineraryDayBase(
            day_number=1,
            title="Historic Asakusa & Modern Skyline",
            estimated_day_cost=75.50
        )
        self.assertEqual(day.day_number, 1)
        self.assertEqual(day.title, "Historic Asakusa & Modern Skyline")

    def test_generation_request(self):
        req = ItineraryGenerationRequest(
            destination="Kyoto",
            duration_days=3,
            budget_tier="moderate",
            travel_style="cultural"
        )
        self.assertEqual(req.destination, "Kyoto")
        self.assertEqual(req.duration_days, 3)
        self.assertEqual(req.budget_tier, "moderate")

    def test_image_attribution(self):
        attr = UnsplashAttribution(
            photographer_name="John Doe",
            photographer_username="johndoe",
            photographer_profile_url="https://unsplash.com/@johndoe",
        )
        img = DestinationImage(
            id="img-123",
            url_regular="https://example.com/img.jpg",
            url_thumb="https://example.com/thumb.jpg",
            attribution=attr,
            is_fallback=False
        )
        self.assertEqual(img.id, "img-123")
        self.assertEqual(img.attribution.photographer_name, "John Doe")
        self.assertIn("wanderplan", img.attribution.unsplash_referral_url)

if __name__ == "__main__":
    unittest.main()
