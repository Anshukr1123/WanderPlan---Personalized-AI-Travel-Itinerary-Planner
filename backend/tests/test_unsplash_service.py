"""Unit tests for Unsplash Image Service."""
import asyncio
import unittest
from app.services.unsplash_service import UnsplashService

class TestUnsplashService(unittest.TestCase):
    def setUp(self):
        self.service = UnsplashService()

    def test_fallback_search(self):
        res = asyncio.run(self.service.search_photos("Tokyo", per_page=2))
        self.assertGreaterEqual(len(res.images), 1)
        self.assertTrue(res.images[0].is_fallback)
        self.assertIn("Tokyo", res.images[0].alt_description)
        self.assertIsNotNone(res.images[0].attribution.photographer_name)
        self.assertIn("wanderplan", res.images[0].attribution.photographer_profile_url)

    def test_default_fallback_search(self):
        res = asyncio.run(self.service.search_photos("UnknownRemoteIsland", per_page=2))
        self.assertGreaterEqual(len(res.images), 1)
        self.assertTrue(res.images[0].is_fallback)
        self.assertTrue(res.images[0].url_regular.startswith("https://images.unsplash.com"))

    def test_availability_check_unconfigured(self):
        self.service.access_key = ""
        res = asyncio.run(self.service.check_availability())
        self.assertFalse(res["available"])
        self.assertFalse(res["configured"])

if __name__ == "__main__":
    unittest.main()
