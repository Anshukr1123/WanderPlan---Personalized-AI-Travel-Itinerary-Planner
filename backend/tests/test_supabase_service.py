"""Unit tests for Supabase Auth and PostgREST persistence service."""
import asyncio
import unittest
from unittest.mock import patch
from app.services.supabase_service import SupabaseService, SupabaseServiceError

class TestSupabaseService(unittest.TestCase):
    def setUp(self):
        self.service = SupabaseService()

    def test_ensure_configured_raises(self):
        with patch("app.services.supabase_service.settings.SUPABASE_URL", ""):
            self.service.base_url = ""
            with self.assertRaises(SupabaseServiceError) as ctx:
                self.service._ensure_configured()
            self.assertEqual(ctx.exception.status_code, 503)

    def test_verify_user_token_empty(self):
        with patch("app.services.supabase_service.settings.SUPABASE_URL", "https://example.supabase.co"), \
             patch("app.services.supabase_service.settings.SUPABASE_ANON_KEY", "anon-key-123"):
            self.service.base_url = "https://example.supabase.co"
            self.service.anon_key = "test-key"
            with self.assertRaises(SupabaseServiceError) as ctx:
                asyncio.run(self.service.verify_user_token("   "))
            self.assertEqual(ctx.exception.status_code, 401)

if __name__ == "__main__":
    unittest.main()
