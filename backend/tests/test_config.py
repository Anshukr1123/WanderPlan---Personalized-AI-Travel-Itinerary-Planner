"""Unit tests for configuration module."""
import os
import unittest
from unittest.mock import patch
from app.config import Settings

class TestConfig(unittest.TestCase):
    def test_default_settings(self):
        settings = Settings()
        self.assertIsInstance(settings.PORT, int)
        self.assertIn("http://localhost:3000", settings.ALLOWED_ORIGINS)
        self.assertEqual(settings.GROQ_MODEL, "llama-3.3-70b-versatile")

    @patch.dict(os.environ, {
        "GROQ_API_KEY": "gsk_test_12345678",
        "UNSPLASH_ACCESS_KEY": "test_access_key",
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_ANON_KEY": "test_anon_key"
    })
    def test_configured_flags(self):
        settings = Settings()
        self.assertTrue(settings.is_groq_configured)
        self.assertTrue(settings.is_unsplash_configured)
        self.assertTrue(settings.is_supabase_configured)

    @patch.dict(os.environ, {
        "VITE_SUPABASE_URL": "https://vite-test.supabase.co",
        "VITE_SUPABASE_ANON_KEY": "vite_test_anon_key",
        "VITE_API_BASE_URL": "https://api.example.com",
        "GROQ_API_KEY": "gsk_test123",
        "GROQ_MODEL": "llama-3.3-70b-versatile",
        "UNSPLASH_ACCESS_KEY": "unsplash_key_123",
        "UNSPLASH_APP_NAME": "WanderPlan"
    })
    def test_vite_prefixed_supabase_fallback(self):
        settings = Settings()
        self.assertEqual(settings.SUPABASE_URL, "https://vite-test.supabase.co")
        self.assertEqual(settings.SUPABASE_ANON_KEY, "vite_test_anon_key")
        self.assertEqual(settings.VITE_API_BASE_URL, "https://api.example.com")
        self.assertEqual(settings.GROQ_MODEL, "llama-3.3-70b-versatile")
        self.assertEqual(settings.UNSPLASH_APP_NAME, "WanderPlan")
        self.assertTrue(settings.is_supabase_configured)
        self.assertTrue(settings.is_groq_configured)
        self.assertTrue(settings.is_unsplash_configured)

    @patch.dict(os.environ, {
        "GROQ_API_KEY": "",
        "UNSPLASH_ACCESS_KEY": "",
        "SUPABASE_URL": "",
        "SUPABASE_ANON_KEY": "",
        "VITE_SUPABASE_URL": "",
        "VITE_SUPABASE_ANON_KEY": ""
    })
    def test_unconfigured_flags(self):
        settings = Settings()
        self.assertFalse(settings.is_groq_configured)
        self.assertFalse(settings.is_unsplash_configured)
        self.assertFalse(settings.is_supabase_configured)

if __name__ == "__main__":
    unittest.main()
