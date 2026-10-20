"""Unit tests for Groq AI Service."""
import asyncio
import unittest
from unittest.mock import patch, MagicMock
from app.services.groq_service import GroqService, GroqServiceError
from app.schemas.itinerary import ItineraryGenerationRequest

class TestGroqService(unittest.TestCase):
    def setUp(self):
        self.service = GroqService()

    def test_unconfigured_error(self):
        with patch.object(self.service, "api_key", ""):
            with self.assertRaises(GroqServiceError):
                self.service._get_headers()

    def test_availability_check_unconfigured(self):
        with patch("app.services.groq_service.settings.GROQ_API_KEY", ""):
            res = asyncio.run(self.service.check_availability())
            self.assertFalse(res["available"])
            self.assertFalse(res["configured"])

    def test_normalize_itinerary_result(self):
        req = ItineraryGenerationRequest(
            destination="Rome",
            duration_days=2,
            budget_tier="moderate",
            travel_style="cultural",
            preferred_currency="EUR"
        )
        raw_mock_output = {
            "title": "Roman Wonders",
            "days": [
                {
                    "day_number": 1,
                    "title": "Colosseum and Ancient Forum",
                    "activities": [
                        {"title": "Colosseum Tour", "estimated_cost": 30.0, "duration_minutes": 120},
                        {"title": "Trastevere Lunch", "estimated_cost": 25.0, "duration_minutes": 60}
                    ]
                },
                {
                    "day_number": 2,
                    "title": "Vatican City Treasures",
                    "activities": [
                        {"title": "St. Peter's Basilica", "estimated_cost": 15.0, "duration_minutes": 90}
                    ]
                }
            ]
        }
        normalized = self.service._normalize_itinerary_result(raw_mock_output, req)
        self.assertEqual(len(normalized["days"]), 2)
        self.assertEqual(normalized["days"][0]["estimated_day_cost"], 55.0)
        self.assertEqual(normalized["days"][1]["estimated_day_cost"], 15.0)
        self.assertEqual(normalized["estimated_total_cost"], 70.0)
        self.assertEqual(normalized["currency"], "EUR")

if __name__ == "__main__":
    unittest.main()
